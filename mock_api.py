# mock_api.py  (run separately:  python mock_api.py)
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route("/detect", methods=["POST"])
def detect():
    data = request.get_json()
    text = data.get("text", "")
    score = min(len(text) / 300, 1)  # toy heuristic
    return jsonify({"score": round(score, 2)})

app.run(port=5050)