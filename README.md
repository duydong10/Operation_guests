# Hệ thống quản lý khách mời
***Cài đặt: <br>
Nodejs 22.16.0: https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi <br>
Python 3.13.3: https://www.python.org/ftp/python/3.13.3/python-3.13.3-amd64.exe***
## 1. Cài đặt Docker Desktop:
#### Bước 1: Bật WSL
      wsl --install
#### Bước 2: Tải về và cài đặt Docker Desktop:
https://docs.docker.com/desktop/setup/install/windows-install/
## 2. Cơ sở dữ liệu (MongoDB):
#### Bước 1: Tải về và cài đặt MongoDB Community Server:
https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-8.0.9-signed.msi
#### Bước 2: Truy cập đường dẫn `C:\Program Files\MongoDB\Server\8.0\bin`, sửa file `mongod.cfg`
      net:
         port: 27017
         bindIp: 0.0.0.0
      replication:
         replSetName: "rs0"
#### Bước 3: Khởi động lại service MongoDB
##### Mở Command Prompt (Administrator):
      net stop MongoDB
      net start MongoDB
#### Bước 4: Mở MongoDB Compass, kết nối URI: `mongodb://{IP_máy}:27017`. Sau khi kết nối thành công mở MongoDB Shell.
#### Bước 5: Thiết lập Replica Set (để sử dụng Change Stream)
      use admin
      rs.initiate()
Trạng thái sẽ trả về cấu hình Replica Set hiện tại, với địa chỉ mongoDB 2 và 3 đang có stateStr không phải là SECONDARY. Cần tạo 2 database với IP, port như trên để có thể add vào PRIMARY. Ở đây dùng 2 database trong docker, với địa chỉ IP của máy, port theo thứ tự là 27018 và 27019. Bên trong file docker_compose.xml của dự án đã có sẵn chỉ cần chạy service bên trong file docker_compose.
   ```js
      rs.add("{IP_mongo2}:{port_mongo2}")
      rs.add("{IP_mongo3}:{port_mongo3}")
      rs.status()
   ```
_id 1 và 2 có stateStr là SECONDARY là thành công.
## 3. Khởi chạy hệ thống:
##### Chạy docker_compose.xml, truy cập http://{IP máy}:5000 vào giao diện WebApp.
