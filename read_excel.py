import pandas as pd
import json

file_path = r'f:\\Code\\0_Painel ABZ-BR-INT\\painel-abz\\docs\\ManSchedule\\Deep Star - Rota.xlsx'

try:
    df = pd.read_excel(file_path, sheet_name=0)
    df = df.astype(str)
    data = df.head(5).to_dict(orient='records')
    columns = df.columns.tolist()
    result = {"columns": columns, "data": data}
    with open('f:\\Code\\0_Painel ABZ-BR-INT\\painel-abz\\parsed_excel.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print("Success")
except Exception as e:
    print("Error:", e)
