from copy import deepcopy
import os
from flask import Flask, request, render_template, jsonify, Response
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
from collections import deque

app = Flask(__name__, static_folder="static")
CORS(app)
load_dotenv(find_dotenv("config.env"))
threadLock = threading.Lock()

# init MongoDB
mongo_uri = os.getenv("MONGO_URI")
clientMongoDB = MongoClient(mongo_uri)
db = clientMongoDB[os.getenv("DB_NAME")]
collection_guests = db[os.getenv("COLLECTION_GUESTS")]
collection_pool = db[os.getenv("COLLECTION_POOL")]
collection_award = db[os.getenv("COLLECTION_AWARD")]


minio_ep = os.getenv("MINIO_ENDPOINT")
minio_ak = os.getenv("MINIO_ACCESS_KEY")
minio_sk = os.getenv("MINIO_SECRET_KEY")

# init minIO
clientMinIO = None
bucket_name = os.getenv("MINIO_BUCKETNAME")
clientMinIO = Minio(
    endpoint=minio_ep,
    access_key=minio_ak,
    secret_key=minio_sk,
    secure=False,
)


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
delay = 1

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


# change streams, lang nghe thay doi trong collection_guests
def listen_to_changes_guests():
    global data_guests, number_of_guests, guests_true
    # global last_guest, last_guest_time
    pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
    try:
        with collection_guests.watch(pipeline=pipeline) as stream:
            for change in stream:
                data_guests = list(collection_guests.find({}, {"_id": 0}))
                number_of_guests = collection_guests.count_documents({})
                guests_true = collection_guests.count_documents(
                    {"timestamp": {"$ne": None, "$exists": True}}
                )
    except Exception as e:
        print("Lỗi khi lắng nghe guests:", e)

#Lang nghe thay doi trong collection_pool
def listen_to_changes_pool():
    global data_pool
    pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
    try:
        with collection_pool.watch(pipeline=pipeline) as stream:
            for change in stream:
                data_pool = list(collection_pool.find({}, {"_id": 0}))
    except Exception as e:
        print("Lỗi khi lắng nghe pool:", e)

#SSE danh sách khách mời
@app.route("/stream/guests")
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

                time.sleep(delay)
            except GeneratorExit:
                break
            except Exception as e:
                print("Lỗi trong SSE:", e)
                break

    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")


# TCP server configuration
tcp_host = os.getenv("TCP_HOST")
tcp_port = int(os.getenv("TCP_PORT"))
tcp_queue = deque()
seen_idhexs = set()

# Chuyen doi hex sang text
def hex_to_text(hex_string):
    try:
        return bytes.fromhex(hex_string).decode("ascii", errors="ignore")
    except ValueError:
        return hex_string


seen_idtexts = set()
tcp_thread = None
tcp_thread_running = False


# TCP client function
def start_tcp_client():
    global tcp_queue, seen_idtexts, tcp_thread_running
    decoder = json.JSONDecoder()
    buffer = ""
    tcp_thread_running = True

    while tcp_thread_running:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.connect((tcp_host, tcp_port))
                s.sendall(b"OK")
                print(f"Đã kết nối đến TCP server {tcp_host}:{tcp_port}")
                while tcp_thread_running:
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
                            idtext = hex_to_text(idhex)
                            if (
                                idhex[:5] != "Error"
                                and idhex[:13] != "Not Attempted"
                                and len(idhex) == 12
                                and rssi > -65
                            ):
                                with threadLock:
                                    if idtext and {"code": idtext} not in tcp_queue:
                                        if idtext in seen_idtexts:
                                            tcp_queue.append({"code": idtext})
                                        else:
                                            tcp_queue.appendleft({"code": idtext})
                                            seen_idtexts.add(idtext)
                            buffer = buffer[idx:].lstrip()
                        except json.JSONDecodeError:
                            break
        except Exception as e:
            print(f"Lỗi TCP client: {e}")
            time.sleep(0.1)

#Cập nhật khách qua cửa
def update_status():
    global tcp_queue, last_guest, delay
    guests = data_guests.copy()
    try:
        while True:
            with threadLock:
                if tcp_queue:
                    queue_count = len(tcp_queue)
                    if queue_count > 9:
                        delay = 1
                    elif queue_count < 3:
                        delay = 3
                    else:
                        delay = 3 - (queue_count - 2)/4
                    print(tcp_queue)
                    item = tcp_queue.popleft()
                    code = item["code"]

                    gate = collection_guests.find_one({"code": code}, {})
                    
                    if gate and gate["code"]:
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
                    last_guest = next((g for g in guests if g["code"] == code), None)
                    time.sleep(delay)
                else:
                    time.sleep(0.01)
                    continue
    except Exception as e:
        print(f"Lỗi trong update_status: {e}")


# Tra ve du lieu khach moi
@app.route("/api/get_guests", methods=["GET"])
def get_guests():
    global data_guests
    try:
        with threadLock:
            for guest in data_guests:
                name = guest["data"]["name"]
                sex = guest["data"]["sex"]

                if sex == "Nam":
                    guest["data"]["name"] = (
                        f"Mr. {name}" if not name.startswith("Mr. ") else name
                    )
                elif sex == "Nữ":
                    guest["data"]["name"] = (
                        f"Ms. {name}" if not name.startswith("Ms. ") else name
                    )
                else:
                    guest["data"]["name"] = (
                        f"Mr/Ms. {name}" if not name.startswith("Mr./Ms. ") else name
                    )

                if guest.get("image"):
                    url = clientMinIO.presigned_get_object(bucket_name, guest["image"])
                    guest["url"] = url
                else:
                    guest["url"] = "../static/images/guest_portrait.png"
            return jsonify(data_guests)
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# Tra ve danh sach quay thuong
@app.route("/api/get_pool", methods=["GET"])
def get_pool():
    global data_pool
    try:
        return jsonify(data_pool)
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# Tra ve danh sach giai thuong
@app.route("/api/get_award", methods=["GET"])
def get_award():
    global data_award
    try:
        return jsonify(data_award)
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# Tra ve so luong khach
@app.route("/api/get_count_guests", methods=["GET"])
def get_count_guests():
    global number_of_guests, guests_true
    try:
        return jsonify({"count": guests_true, "number_of_guests": number_of_guests})
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# Tra ve thong tin khach moi check-in
@app.route("/api/get_last_guest", methods=["GET"])
def get_last_guest():
    global last_guest
    try:
        return jsonify(last_guest)
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# Tra ve thong tin quet rfid
@app.route("/api/get_rfid", methods=["GET"])
def get_rfid():
    global tcp_queue
    try:
        return jsonify(list(tcp_queue)), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# Cap nhat thong tin khach moi
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

# Them khach moi
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
                    "sex": None,
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


starttime = {"hours": 20, "minutes": 0, "seconds": 0}

# Thiet lap thoi gian bat dau quay thuong
@app.route("/api/set_starttime", methods=["POST"])
def set_starttime():
    global starttime
    try:
        starttime = request.get_json()
        return jsonify({"message": "Thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500

# Tra ve thoi gian bat dau quay thuong
@app.route("/api/get_starttime", methods=["GET"])
def get_starttime():
    global starttime
    try:
        return jsonify(starttime), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500

# Cap nhat config.env theo cac dong dict
def update_config_env(updates: dict, config_path="config.env"):
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            lines = f.readlines()
    else:
        lines = []

    new_lines = []
    found_keys = {key: False for key in updates}

    for line in lines:
        updated = False
        for key, value in updates.items():
            if line.startswith(f"{key}="):
                new_lines.append(f"{key}={value}\n")
                found_keys[key] = True
                updated = True
                break
        if not updated:
            new_lines.append(line)

    for key, value in updates.items():
        if not found_keys[key]:
            new_lines.append(f"{key}={value}\n")

    with open(config_path, "w") as f:
        f.writelines(new_lines)

# Thiet lap TCP client config
@app.route("/api/set_tcpclient", methods=["POST"])
def set_tcpclient():
    global tcp_host, tcp_port, tcp_thread, tcp_thread_running
    try:
        data = request.get_json()
        tcp_host = data["tcp_host"]
        tcp_port = data["tcp_port"]

        # stop current thread
        tcp_thread_running = False
        time.sleep(1)

        # start new thread
        tcp_thread = threading.Thread(target=start_tcp_client, daemon=True)
        tcp_thread.start()

        update_config_env({"TCP_HOST": tcp_host, "TCP_PORT": str(tcp_port)})

        return jsonify({"message": "TCP client config cập nhật thành công!"}), 200

    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500

# Tra ve TCP client config
@app.route("/api/get_tcpclient", methods=["GET"])
def get_tcpclient():
    global tcp_host, tcp_port
    try:
        return jsonify({"tcp_host": tcp_host, "tcp_port": tcp_port}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500

# Thiet lap MinIO config
@app.route("/api/set_minio", methods=["POST"])
def set_minio():
    global minio_ep, minio_ak, minio_sk, bucket_name, clientMinIO
    try:
        data = request.get_json()
        minio_ep = data["end_point"]
        minio_ak = data["access_key"]
        minio_sk = data["secret_key"]
        bucket_name = data["bucket_name"]

        clientMinIO = Minio(
            endpoint=minio_ep,
            access_key=minio_ak,
            secret_key=minio_sk,
            secure=False,
        )

        update_config_env(
            {
                "MINIO_ENDPOINT": data["end_point"],
                "MINIO_ACCESS_KEY": data["access_key"],
                "MINIO_SECRET_KEY": data["secret_key"],
                "MINIO_BUCKETNAME": data["bucket_name"],
            }
        )
        return jsonify({"message": "MinIO config cập nhật thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500

# Tra ve MinIO config
@app.route("/api/get_minio", methods=["GET"])
def get_minio():
    global minio_ep, minio_ak, minio_sk, bucket_name
    try:
        return (
            jsonify(
                {
                    "end_point": minio_ep,
                    "access_key": minio_ak,
                    "secret_key": minio_sk,
                    "bucket_name": bucket_name,
                }
            ),
            200,
        )
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


if __name__ == "__main__":
    threading.Thread(target=listen_to_changes_guests, daemon=True).start()
    threading.Thread(target=listen_to_changes_pool, daemon=True).start()
    tcp_thread = threading.Thread(target=start_tcp_client, daemon=True)
    tcp_thread.start()
    threading.Thread(target=update_status, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False)
