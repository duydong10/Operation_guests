from copy import deepcopy
import os
from flask import Flask, request, render_template, jsonify, Response, url_for
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv, find_dotenv
import threading
from flask import Response, stream_with_context
import time
from minio import Minio
from datetime import datetime, timezone
import socket
import json

app = Flask(__name__, static_folder="static")
CORS(app)
load_dotenv(find_dotenv("config.env"))

# init MongoDB
clientMongoDB = MongoClient(os.getenv("MONGO_URI"))
db = clientMongoDB[os.getenv("DB_NAME")]
collection_guests = db[os.getenv("COLLECTION_GUESTS")]
collection_pool = db[os.getenv("COLLECTION_POOL")]
collection_award = db[os.getenv("COLLECTION_AWARD")]

# init minIO
clientMinIO = Minio(
    endpoint=os.getenv("MINIO_ENDPOINT"),
    # access_key=os.getenv("MINIO_ACCESS_KEY"),
    # secret_key=os.getenv("MINIO_SECRET_KEY"),
    secure=False,
)
bucket_name = os.getenv("MINIO_BUCKETNAME")

# global variable
data_pool = list(collection_pool.find({}, {"_id": 0}))
data_guests = list(collection_guests.find({}, {"_id": 0}))
data_award = list(collection_award.find({}, {"_id": 0}))
number_of_guests = collection_guests.count_documents({})
guests_true = collection_guests.count_documents(
    {"timestamp": {"$ne": None, "$exists": True}}
)
last_guest = {}
last_guest_time = 0
count = [0, 0, 0]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


# change streams
def listen_to_changes_guests():
    global data_guests, number_of_guests, guests_true
    global last_guest, last_guest_time
    pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
    try:
        with collection_guests.watch(pipeline=pipeline) as stream:
            for change in stream:
                # print("Có thay đổi trong collection guests:", change)

                data_guests = list(collection_guests.find({}, {"_id": 0}))
                number_of_guests = collection_guests.count_documents({})
                guests_true = collection_guests.count_documents(
                    {"timestamp": {"$ne": None, "$exists": True}}
                )

                if change["operationType"] == "update":
                    updated_fields = change["updateDescription"]["updatedFields"]
                    if "status" in updated_fields:
                        current_time = time.time()
                        if current_time - last_guest_time >= 3:
                            last_guest = collection_guests.find_one(
                                {"_id": change["documentKey"]["_id"]}, {"_id": 0}
                            )
                            last_guest_time = current_time

    except Exception as e:
        print("Lỗi khi lắng nghe guests:", e)


def listen_to_changes_pool():
    global data_pool
    pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
    try:
        with collection_pool.watch(pipeline=pipeline) as stream:
            for change in stream:
                print("Có thay đổi trong collection pool:", change)
                data_pool = list(collection_pool.find({}, {"_id": 0}))
    except Exception as e:
        print("Lỗi khi lắng nghe pool:", e)


@app.route("/guests/stream")
def stream_guests():
    def event_stream():
        last_data = None
        while True:
            try:
                # Lấy số lượng hoặc timestamp mới nhất làm điều kiện thay đổi
                guests = list(collection_guests.find({}, {"_id": 0}))
                current_data = str(guests)

                if current_data != last_data:
                    last_data = current_data
                    yield f"data: {current_data}\n\n"

                time.sleep(2)
            except GeneratorExit:
                break
            except Exception as e:
                print("Lỗi trong SSE:", e)
                break

    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")


# TCP server configuration
host = os.getenv("TCP_HOST")
port = int(os.getenv("TCP_PORT"))
tcp_queue = []
seen_idhexs = set()


def hex_to_text(hex_string):
    try:
        return bytes.fromhex(hex_string).decode("ascii", errors="ignore")
    except ValueError:
        return hex_string


# TCP client function
def start_tcp_client():
    global tcp_queue, seen_idhexs
    decoder = json.JSONDecoder()
    buffer = ""

    while True:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.connect((host, port))
                s.sendall(b"OK")

                while True:
                    data = s.recv(1024)
                    if not data:
                        break

                    buffer += data.decode()

                    while buffer:
                        try:
                            json_obj, idx = decoder.raw_decode(buffer)
                            data_obj = json_obj.get("data", {})
                            idhex = data_obj.get("idHex")
                            rssi = data_obj.get("peakRssi")

                            if idhex and idhex not in seen_idhexs:
                                if (
                                    idhex[:5] != "Error"
                                    and idhex[:13] != "Not Attempted"
                                    and len(idhex) == 12
                                    # and rssi > -65
                                ):
                                    tcp_queue.append(
                                        {
                                            "code": bytes.fromhex(idhex).decode(
                                                "ascii", errors="ignore"
                                            )
                                        }
                                    )
                                    seen_idhexs.add(idhex)

                            buffer = buffer[idx:].lstrip()
                        except json.JSONDecodeError:
                            break

        except Exception as e:
            print(f"Lỗi TCP client: {e}")
            time.sleep(2)


pass_gate = []


def update_status():
    global tcp_queue, last_guest, pass_gate
    try:
        while True:
            if tcp_queue:
                item = tcp_queue.pop(0)
                code = item["code"]
            else:
                time.sleep(1)
                continue

            gate = collection_guests.find_one({"code": code}, {})

            if gate and gate["code"] not in pass_gate:
                if gate["status"] == True:
                    collection_guests.update_one(
                        {"code": code},
                        {"$set": {"status": False}},
                    )
                elif gate["status"] == False:
                    collection_guests.update_one(
                        {"code": code},
                        {"$set": {"status": True}},
                    )
                print(f"{code} đã qua cửa!")
                pass_gate.append(gate["code"])
            time.sleep(1)

    except Exception as e:
        print(f"Lỗi: {e}")


def reset_seen_idhexs():
    global seen_idhexs, pass_gate
    while True:
        time.sleep(60)
        seen_idhexs.clear()
        pass_gate.clear()


# api tra ve json du lieu khach
@app.route("/api/get_guests", methods=["GET"])
def get_guests():
    try:
        guests = deepcopy(data_guests)  # tạo bản sao an toàn
        for guest in guests:
            name = guest["data"]["name"]
            sex = guest["data"]["sex"]

            if sex == "Nam":
                guest["data"]["name"] = f"Mr. {name}" if not name.startswith("Mr. ") else name
            elif sex == "Nữ":
                guest["data"]["name"] = f"Ms. {name}" if not name.startswith("Ms. ") else name
            else:
                guest["data"]["name"] = f"Mr/Ms. {name}" if not name.startswith("Mr./Ms. ") else name

            if guest.get("image"):
                url = clientMinIO.presigned_get_object(bucket_name, guest["image"])
                guest["url"] = url
            else:
                guest["url"] = "../static/images/guest_portrait.png"
        return jsonify(guests)
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# api tra ve danh sach quay thuong
@app.route("/api/get_pool", methods=["GET"])
def get_pool():
    global data_pool
    try:
        return jsonify(data_pool)
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# api tra ve danh sach giai thuong
@app.route("/api/get_award", methods=["GET"])
def get_award():
    global data_award
    try:
        return jsonify(data_award)
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# api tra ve so luong khach
@app.route("/api/get_count_guests", methods=["GET"])
def get_count_guests():
    global number_of_guests, guests_true
    try:
        return jsonify({"count": guests_true, "number_of_guests": number_of_guests})
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# api tra ve thong tin khach moi check-in
@app.route("/api/get_last_guest", methods=["GET"])
def get_last_guest():
    global last_guest
    try:
        if not last_guest:
            return jsonify({"message": "Chưa có khách mới!"}), 201
        else:
            url = clientMinIO.presigned_get_object(bucket_name, last_guest["image"])
            lguest = last_guest.copy()
            lguest["url"] = url

            last_guest = {}
        return jsonify(lguest)
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# api tra ve thong tin quet rfid
@app.route("/api/get_rfid", methods=["GET"])
def get_rfid():
    global tcp_queue
    try:
        return jsonify(tcp_queue), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# route cap nhat trang thai khach hang
@app.route("/api/update_guest", methods=["POST"])
def update_guest():
    try:
        data = request.get_json()
        result = collection_guests.update_one(
            {"code": data["code"]},
            {"$set": {"image": data["image"], "timestamp": datetime.now(timezone.utc)}},
        )
        if result.matched_count == 0:
            return jsonify({"message": "Không tìm thấy khách mời!"}), 404
        return jsonify({"message": "Cập nhật ảnh thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


@app.route("/api/insert_guest", methods=["POST"])
def insert_guest():
    try:
        data = request.get_json()
        collection_guests.insert_one(
            {
                "data": {
                    "name": data["data"]["name"],
                    "company": data["data"]["company"],
                    "role": "extra",
                    "position": "VIP",
                    "tableid": None,
                    "sex": None
                },
                "image": None,
                "code": data["code"],
                "status": False,
                "timestamp": None,
            }
        )
        return jsonify({"message": "Thêm khách thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


@app.route("/api/update_pool", methods=["POST"])
def update_pool():
    try:
        data = request.get_json()
        collection_pool.update_one(
            {"code": data["code"]},
            {"$set": {"id_award": data["id_award"], "timestamp": data["timestamp"]}},
        )
        return jsonify({"message": "Thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


starttime = {"hours": 20, "minutes": 0, "seconds": 0}


@app.route("/api/set_starttime", methods=["POST"])
def set_starttime():
    global starttime
    try:
        starttime = request.get_json()
        return jsonify({"message": "Thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


@app.route("/api/get_starttime", methods=["GET"])
def get_starttime():
    global starttime
    try:
        return jsonify(starttime), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


if __name__ == "__main__":
    threading.Thread(target=listen_to_changes_guests, daemon=True).start()
    threading.Thread(target=listen_to_changes_pool, daemon=True).start()
    threading.Thread(target=start_tcp_client, daemon=True).start()
    threading.Thread(target=update_status, daemon=True).start()
    threading.Thread(target=reset_seen_idhexs, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False)
