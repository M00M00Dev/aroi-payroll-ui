# Version: 260327-FINAL-STABLE-BACKEND
import datetime, os, requests, logging, gc
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ID_AROI_TEAM = "1oZ_HXEexnlMaaAdGalWPHdEFVL4HVrR52YfFxXAFMnw"
ID_STAFF_TRUTH = "1L5ZpNgmFvO7huy8M-m74vI-0Vynba5-XHswSinzdpHk"
SHEET_NAME = "MR"
SQUARE_TOKEN = os.environ.get("SQUARE_ACCESS_TOKEN", "EAAAl9bhnOucG_PxaUrqH-RrDbDDSMW7X1HXuzvWEmfMrmRMH8MtPa4vOmLjvTPT")

def get_google_service():
    token_path = 'token.json'
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, ['https://www.googleapis.com/auth/spreadsheets'])
        return build('sheets', 'v4', credentials=creds, cache_discovery=False)
    return None

def parse_date(s):
    if not s: return None
    for fmt in ["%d-%b-%y", "%d-%b-%Y", "%d-%m-%y", "%d-%m-%Y", "%Y-%m-%d"]:
        try: return datetime.datetime.strptime(str(s).strip(), fmt).date()
        except: continue
    return None

def get_reconciliation_data(start_date_str="2026-03-09"):
    service = get_google_service()
    if not service: return []
    
    dt1 = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
    dt2 = dt1 + datetime.timedelta(days=7)
    headers = {"Authorization": f"Bearer {SQUARE_TOKEN}", "Content-Type": "application/json"}

    # 1. Square Data
    sq_names = {}
    actual_hrs = {}
    try:
        r1 = requests.post("https://connect.squareup.com/v2/team-members/search", headers=headers, json={}, timeout=15)
        for m in r1.json().get('team_members', []):
            sq_names[m['id']] = f"{m.get('given_name','')} {m.get('family_name','')}".strip()
        
        end_dt = dt1 + datetime.timedelta(days=14)
        r2 = requests.post("https://connect.squareup.com/v2/labor/timecards/search", headers=headers, json={"query": {"filter": {"start_at": {"start_at": dt1.strftime("%Y-%m-%dT00:00:00Z"), "end_at": end_dt.strftime("%Y-%m-%dT23:59:59Z")}}}}, timeout=15)
        for tc in r2.json().get('timecards', []):
            tid = tc['team_member_id']
            if tid not in actual_hrs: actual_hrs[tid] = [0.0]*14
            start = datetime.datetime.fromisoformat(tc['start_at'].replace('Z', '').split('+')[0])
            off = (start.date() - dt1).days
            if 0 <= off < 14:
                dur = (datetime.datetime.fromisoformat(tc['end_at'].replace('Z', '').split('+')[0]) - start).total_seconds() / 3600
                actual_hrs[tid][off] += dur
    except: pass

    # 2. Staff Truth (Tab 2) - Match by Long ID
    meta = {}
    try:
        res = service.spreadsheets().values().get(spreadsheetId=ID_STAFF_TRUTH, range="'staff'!A2:Q500").execute()
        for r in res.get('values', []):
            if len(r) > 0:
                sid = str(r[0]).strip()
                meta[sid] = {
                    "shop": str(r[16]).strip() if len(r) > 16 else "Other",
                    "rate": float(str(r[10]).replace('$','').replace(',','').strip() or 0),
                    "rate_we": float(str(r[11]).replace('$','').replace(',','').strip() or 0)
                }
    except: pass

    # 3. Roster Data (Tab 1)
    res = service.spreadsheets().values().get(spreadsheetId=ID_AROI_TEAM, range=f"'{SHEET_NAME}'!A1:P1000").execute()
    rows = res.get('values', [])
    staff_final = {}
    curr_date = None
    in_fence = False
    
    for r in rows:
        if not r: continue
        m = str(r[0]).strip()
        d = parse_date(r[4]) if len(r) > 4 else None
        if "WEEK" in m.upper() or d:
            if d: curr_date = d
            in_fence = True; continue
        if "END" in m.upper(): in_fence = False; continue
        
        # If the ID in Column A is a Square Long ID
        if in_fence and curr_date in [dt1, dt2] and m in sq_names:
            if m not in staff_final: staff_final[m] = {"name": sq_names[m], "roster": [0.0]*14, "extra": [0.0, 0.0]}
            blk = 0 if curr_date == dt1 else 1
            for i in range(7):
                if len(r) > 4+i:
                    try: staff_final[m]["roster"][(blk*7)+i] += float(str(r[4+i]).replace(',','') or 0)
                    except: pass
            if len(r) > 13:
                try: staff_final[m]["extra"][blk] += float(str(r[13]).replace('$','').replace(',','') or 0)
                except: pass

    output = []
    for sid, p in staff_final.items():
        m_data = meta.get(sid, {})
        output.append({
            "id": sid, "name": p["name"], "shop": m_data.get("shop", "Other"),
            "rate_weekday": m_data.get("rate", 0), "rate_weekend": m_data.get("rate_we", 0),
            "extra": p["extra"], 
            "daily": [{"r": round(p["roster"][i], 2), "s": round(actual_hrs.get(sid, [0.0]*14)[i], 2)} for i in range(14)]
        })
    gc.collect()
    return output

def update_manager_sheet(payload, start_date_str):
    return True