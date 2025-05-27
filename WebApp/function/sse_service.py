import time
import os
from pymongo import MongoClient
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv("config.env"))
mongo_uri = os.getenv("MONGO_URI")
clientMongoDB = MongoClient(mongo_uri)
db = clientMongoDB[os.getenv("DB_NAME")]
collection_guests = db[os.getenv("COLLECTION_GUESTS")]

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

                time.sleep(1)
            except GeneratorExit:
                break
            except Exception as e:
                print("Lỗi trong SSE:", e)
                break