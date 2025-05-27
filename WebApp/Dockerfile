# WebApp/Dockerfile
FROM python:3.13.3-alpine

WORKDIR /app

# Cài đặt các thư viện cần thiết từ requirements.txt
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép mã nguồn vào thư mục làm việc
COPY . .

CMD ["python", "app.py"]