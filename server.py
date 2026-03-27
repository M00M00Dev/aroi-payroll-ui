import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import aroi_payroll 

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/api/payroll-data', methods=['GET'])
def get_payroll():
    try:
        start_date = request.args.get('start', '2026-03-09')
        data = aroi_payroll.get_reconciliation_data(start_date)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug-matching', methods=['GET'])
def debug_matching():
    try:
        service = aroi_payroll.get_google_service()
        # 1. Get raw staff metadata from Spreadsheet
        staff_meta = aroi_payroll.get_staff_metadata(service)
        # 2. Get reconciliation data (names from Square/Roster)
        start_date = request.args.get('start', '2026-03-09')
        reconciled = aroi_payroll.get_reconciliation_data(start_date)
        
        return jsonify({
            "staff_truth_entries": len(staff_meta),
            "reconciliation_entries": len(reconciled),
            "staff_truth_names": [s['full_name_upper'] for s in staff_meta][:10],
            "square_names_received": [r['name'] for r in reconciled][:10]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sync', methods=['POST'])
def sync_data():
    try:
        payload = request.json
        success = aroi_payroll.update_manager_sheet(payload.get('data', []), payload.get('startDate'))
        return jsonify({"status": "success" if success else "error"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def health():
    return jsonify({"status": "stable", "version": "260327-DEBUG"}), 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
