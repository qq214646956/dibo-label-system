"""
SAP RFC 库存查询脚本
功能：调用 Z_MM_GET_STOCK 接口，获取物料库存信息
作者：根据用户需求定制
日期：2026-04-23
"""

import pyrfc
from pyrfc import Connection, ABAPApplicationError, ABAPRuntimeError, LogonError, CommunicationError

# =============================================
# 1. 配置区域（请根据你的实际环境修改）
# =============================================

# SAP 连接参数
SAP_CONFIG = {
    'ashost': '172.168.10.38',   # 例如 '192.168.1.100'
    'sysnr':  '00',                    # 系统编号，通常是00
    'client': '120',                   # 客户端
    'user':   'IT01',
    'passwd': 'xiaoxiang123',
    'lang':   'ZH'                     # 语言，ZH是中文
}

# 查询条件（按需填写，留空表示不限制）
QUERY_CONDITIONS = {
    'matnr':  '3001-00001-00003',      # 物料编码，例如 'MAT001'
    'werks':  '2200',  # 工厂，例如 '1000'
    'lgort':  '',      # 存储地点
    'charg':  '',      # 批次编号
    'txsbm':  '',      # 特性识别码
    'zsign1': '',      # 是否查询特殊库存 ('X' = 是, '' = 否)
    'zsign2': ''       # 是否查询批次库存 ('X' = 是, '' = 否)
}

# =============================================
# 2. 核心功能函数
# =============================================

def connect_sap(config):
    """
    建立与 SAP 系统的连接

    Args:
        config (dict): 连接参数字典

    Returns:
        Connection: 成功时返回连接对象，失败返回 None
    """
    try:
        conn = Connection(**config)
        print("✅ 成功连接到 SAP 系统")
        return conn
    except LogonError as e:
        print(f"❌ 登录失败！请检查用户名、密码或客户端。错误信息: {e}")
    except CommunicationError as e:
        print(f"❌ 网络通信失败！请检查服务器地址和系统编号。错误信息: {e}")
    except Exception as e:
        print(f"❌ 连接时发生未知错误: {e}")
    return None


def call_stock_rfc(conn, conditions):
    """
    调用 Z_MM_GET_STOCK RFC 函数，获取库存数据

    Args:
        conn (Connection): SAP 连接对象
        conditions (dict): 查询条件，包含 matnr, werks, lgort, charg, txsbm, zsign1, zsign2

    Returns:
        list: 库存表数据（列表嵌套字典），失败返回空列表
    """
    # 构造导入参数 IS_INPUT
    input_params = {
        'MATNR': conditions.get('matnr', ''),
        'WERKS': conditions.get('werks', ''),
        'LGORT': conditions.get('lgort', ''),
        'CHARG': conditions.get('charg', ''),
        'TXSBM': conditions.get('txsbm', ''),
        'ZSIGN1': conditions.get('zsign1', ''),
        'ZSIGN2': conditions.get('zsign2', '')
    }

    try:
        print("🚀 正在调用 RFC 函数 Z_MM_GET_STOCK ...")
        # 注意：STOCK 是 TABLES 参数，调用时必须传入空列表占位
        result = conn.call('Z_MM_GET_STOCK_DETAIL',
                           IS_INPUT=input_params)

        stock_data = result.get('STOCK', [])
        print(f"📊 成功获取到 {len(stock_data)} 条库存记录")
        return stock_data

    except (ABAPApplicationError, ABAPRuntimeError) as e:
        print(f"❌ ABAP 层错误！请检查函数名称和参数是否正确。错误信息: {e}")
    except Exception as e:
        print(f"❌ 调用 RFC 时发生未知错误: {e}")

    return []


def print_stock_data(stock_list):
    """
    格式化打印库存数据

    Args:
        stock_list (list): 库存数据列表
    """
    if not stock_list:
        print("⚠️ 没有库存数据可显示")
        return

    print(f"\n📦 共 {len(stock_list)} 条库存记录")
    print("=" * 120)

    # 打印表头
    header = (
        f"{'物料编码':<20}"
        f"{'工厂':<6}"
        f"{'库位':<6}"
        f"{'批次':<12}"
        f"{'非限制库存':<12}"
        f"{'质检库存':<10}"
        f"{'冻结库存':<10}"
        f"{'单位':<6}"
        f"{'物料描述':<20}"
    )
    print(header)
    print("-" * 120)

    # 遍历每一条记录
    for item in stock_list:
        # 辅助函数：安全获取字段值并去除首尾空格
        def get_val(field_name, default=''):
            val = item.get(field_name, default)
            if isinstance(val, str):
                return val.strip()
            return val if val is not None else default

        # 辅助函数：转换数量字段为浮点数
        def to_float(val):
            if val is None:
                return 0.0
            if isinstance(val, (int, float)):
                return float(val)
            try:
                return float(str(val).replace(',', '').strip())
            except (ValueError, TypeError):
                return 0.0

        matnr = get_val('MATNR')
        werks = get_val('WERKS')
        lgort = get_val('LGORT')
        charg = get_val('CHARG')
        labst = to_float(item.get('LABST'))
        insme = to_float(item.get('INSME'))
        speme = to_float(item.get('SPEME'))
        meins = get_val('MEINS')
        maktx = get_val('MAKTX')

        # 如果物料描述为空，尝试取其他字段（如 NAME1）
        if not maktx:
            maktx = get_val('NAME1') or get_val('LGOBE') or ''

        # 打印一行
        print(
            f"{matnr:<20}"
            f"{werks:<6}"
            f"{lgort:<6}"
            f"{charg:<12}"
            f"{labst:<12.3f}"
            f"{insme:<10.3f}"
            f"{speme:<10.3f}"
            f"{meins:<6}"
            f"{maktx:<20}"
        )

    print("=" * 120)


def save_to_csv(stock_list, filename='stock_data.csv'):
    """ 
    将库存数据保存为 CSV 文件（可选功能）
    """
    import csv
    if not stock_list:
        print("⚠️ 无数据可保存")
        return

    # 获取所有字段名（取第一条记录的键）
    fieldnames = list(stock_list[0].keys())

    try:
        with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(stock_list)
        print(f"💾 数据已保存至 {filename}")
    except Exception as e:
        print(f"❌ 保存 CSV 文件失败: {e}")


# =============================================
# 3. 主程序入口
# =============================================
if __name__ == "__main__":
    # 1. 连接 SAP
    conn = connect_sap(SAP_CONFIG)

    if conn:
        try:
            # 2. 调用 RFC 获取数据
            stock_data = call_stock_rfc(conn, QUERY_CONDITIONS)

            # 3. 打印数据
            if stock_data:
                print_stock_data(stock_data)

                # 4. 可选：保存为 CSV 文件
                save_to_csv(stock_data, '库存数据.csv')
            else:
                print("⚠️ 未查询到任何库存数据，请检查查询条件或接口权限。")

        finally:
            # 5. 关闭连接
            conn.close()
            print("\n🔌 SAP 连接已关闭")