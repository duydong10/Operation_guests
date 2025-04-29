import os
from flask import Flask, request, render_template, jsonify, Response
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv, find_dotenv
import random
import threading
from flask import Response, stream_with_context
import time
from minio import Minio

app = Flask(__name__)
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
    access_key=os.getenv("MINIO_ACCESS_KEY"),
    secret_key=os.getenv("MINIO_SECRET_KEY"),
    secure=False,
)
bucket_name = os.getenv("MINIO_BUCKETNAME")

# global variable
data_pool = list(collection_pool.find({}, {"_id": 0}))
data_guests = list(collection_guests.find({}, {"_id": 0}))
data_award = list(collection_award.find({}, {"_id": 0}))
number_of_guests = collection_guests.count_documents({})
guests_true = collection_guests.count_documents({"status": True})
last_guest = {}
count = [0, 0, 0]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/settings")
def settings():
    return render_template("settings.html")


# change streams
def listen_to_changes_guests():
    global data_guests, number_of_guests, guests_true, last_guest
    pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
    try:
        with collection_guests.watch(pipeline=pipeline) as stream:
            for change in stream:
                print(
                    "Có thay đổi trong collection guests:", change["updateDescription"]
                )
                data_guests = list(collection_guests.find({}, {"_id": 0}))
                number_of_guests = collection_guests.count_documents({})
                guests_true = collection_guests.count_documents({"status": True})
                if "image" in change["updateDescription"]["updatedFields"]:
                    last_guest = collection_guests.find_one(
                        {
                            "image": change["updateDescription"]["updatedFields"][
                                "image"
                            ]
                        },
                        {"_id": 0},
                    )
                else:
                    last_guest = {}
    except Exception as e:
        print("Lỗi khi lắng nghe guests:", e)


def listen_to_changes_pool():
    global data_pool
    pipeline = [{"$match": {"operationType": {"$in": ["insert", "update"]}}}]
    try:
        with collection_pool.watch(pipeline=pipeline) as stream:
            for change in stream:
                print("Có thay đổi trong collection pool:", change["updateDescription"])
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


# api tra ve json du lieu khach
@app.route("/api/get_guests", methods=["GET"])
def get_guests():
    global data_guests
    try:
        return jsonify(data_guests)
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

        url = clientMinIO.presigned_get_object(bucket_name, last_guest["image"])
        lguest = last_guest.copy()
        lguest["url"] = url

        last_guest = {}
        return jsonify(lguest)
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# api random quay so
@app.route("/api/wheel_prize", methods=["POST"])
def wheel_prize():
    global data_pool, count
    option = request.get_json()["option"]
    try:
        match option:
            case 1:
                if count[0] >= 1:
                    return jsonify({"message": "Đã hết giải nhất!"}), 400
                else:
                    chosen = random.choice(data_pool)
                    data_pool.remove(chosen)
                    count[0] += 1
                    collection_pool.update_one(
                        {"qrcode": chosen["qrcode"]},
                        {"$set": {"prize": "First Prize"}},
                    )
                    winner = collection_guests.find_one(
                        {"qrcode": chosen["qrcode"]}, {"_id": 0}
                    )
                    return jsonify(winner), 200
            case 2:
                if count[1] >= 2:
                    return jsonify({"message": "Đã hết giải nhì!"}), 400
                else:
                    chosen = random.choice(data_pool)
                    data_pool.remove(chosen)
                    count[1] += 1
                    collection_pool.update_one(
                        {"qrcode": chosen["qrcode"]},
                        {"$set": {"prize": "Second Prize"}},
                    )
                    winner = collection_guests.find_one(
                        {"qrcode": chosen["qrcode"]}, {"_id": 0}
                    )
                    return jsonify(winner), 200
            case 3:
                if count[2] >= 3:
                    return jsonify({"message": "Đã hết giải ba!"}), 400
                else:
                    chosen = random.choice(data_pool)
                    data_pool.remove(chosen)
                    count[2] += 1
                    collection_pool.update_one(
                        {"qrcode": chosen["qrcode"]},
                        {"$set": {"prize": "Third Prize"}},
                    )
                    winner = collection_guests.find_one(
                        {"qrcode": chosen["qrcode"]}, {"_id": 0}
                    )
                    return jsonify(winner), 200
            case _:
                return jsonify({"message": "Lỗi!"}), 400

        return jsonify({"message": "Thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


# route cap nhat trang thai khach hang
@app.route("/api/update_guest", methods=["POST"])
def update_guest():
    try:
        data = request.get_json()
        check = collection_guests.find_one({"qrcode": data["qrcode"]}, {"status": 1})
        check_img = collection_guests.count_documents({"image": data["image"]})
        if check["status"] == True:
            return jsonify({"message": "Khách đã check-in trước đó!"}), 400
        else:
            # if check_img == 1:
            result = collection_guests.update_one(
                {"qrcode": data["qrcode"]},
                {"$set": {"status": True, "image": data["image"]}},
            )
            check_pool = collection_pool.find_one(
                {"qrcode": data["qrcode"]}, {"_id": 0}
            )
            if not check_pool:
                collection_pool.insert_one(
                    {"qrcode": data["qrcode"], "id_award": None, "timestamp": None}
                )
            # else:
            #     return jsonify({"message": "Hình ảnh đã dùng cho khách mời khác!"}), 404
        if result.matched_count == 0:
            return jsonify({"message": "Không tìm thấy khách mời!"}), 404
        return jsonify({"message": "Check-in thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


@app.route("/api/insert_guest", methods=["POST"])
def insert_guest():
    try:
        data = request.get_json()
        data["status"] = False
        collection_guests.insert_one(data)
        return jsonify({"message": "Thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


@app.route("/api/update_pool", methods=["POST"])
def update_pool():
    try:
        data = request.get_json()
        collection_pool.update_one(
            {"qrcode": data["qrcode"]},
            {"$set": {"id_award": data["id_award"], "timestamp": data["timestamp"]}},
        )
        return jsonify({"message": "Thành công!"}), 200
    except Exception as e:
        return jsonify({"message": f"Lỗi: {e}"}), 500


if __name__ == "__main__":
    threading.Thread(target=listen_to_changes_guests, daemon=True).start()
    threading.Thread(target=listen_to_changes_pool, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False)
