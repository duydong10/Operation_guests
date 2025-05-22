// settings.js
import { set_startTime, get_startTime } from "./countdown.js";
import {
  fetchPostTCP,
  fetchGetTCP,
  fetchPostMinio,
  fetchGetMinio,
} from "./api.js";

window.addEventListener("DOMContentLoaded", () => {
  get_startTime();
  set_startTime();
});

const settime_btn = document.getElementById("settime-btn");
const settcp_btn = document.getElementById("settcp-btn");
const setminio_btn = document.getElementById("setminio-btn");
const options_content = document.getElementById("options");

settcp_btn.onclick = () => {
  options_content.innerHTML = `
    <p
          class="2xl:text-3xl xl:text-2xl lg:text-xl md:text-lg text-xs col-span-3 p-5 pl-10"
        >
          <strong class="text-blue-800">TCP server configuration</strong>
        </p>
        <div class="text-left pl-10 pt-2">
          <form id="tcpForm">
            <label for="tcp_host">Host: </label><br />
            <input
              type="text"
              id="tcp_host"
              name="tcp_host"
              placeholder="Nhập host..."
              class="h-8"
              required
            />
            <br />
            <label for="tcp_port" class="pt-5">Port: </label><br />
            <input
              type="number"
              id="tcp_port"
              name="tcp_port"
              min="0"
              max="65535"
              placeholder="Nhập port..."
              class="h-8"
              required
            />
            <br />
            <button
              type="submit"
              class="rounded-lg bg-blue-500 hover:bg-blue-700 duration-300 shadow-lg hover:shadow-2xl text-white py-1 px-4 my-4"
            >
              Xác nhận
            </button>
          </form>
        </div>
  `;
  get_tcp();
  set_tcp();
};

export function get_tcp() {
  fetchGetTCP()
    .then((data) => {
      const tcp_host = document.getElementById("tcp_host");
      const tcp_port = document.getElementById("tcp_port");

      if (tcp_host && tcp_port) {
        tcp_host.value = data.tcp_host;
        tcp_port.value = data.tcp_port;
      }
    })
    .catch((err) => {
      console.error("Lỗi lấy thông tin TCP:", err);
    });
}

export function set_tcp() {
  const form = document.getElementById("tcpForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const tcp_host = document.getElementById("tcp_host").value;
    const tcp_port = parseInt(document.getElementById("tcp_port").value, 10);

    fetchPostTCP(tcp_host, tcp_port)
      .then(() => {
        alert("Cập nhật thành công!");
      })
      .catch((err) => {
        console.error("Lỗi cập nhật:", err);
        alert("Cập nhật thất bại.");
      });
  });
}

settime_btn.onclick = () => {
  options_content.innerHTML = `
    <p
          class="2xl:text-3xl xl:text-2xl lg:text-xl md:text-lg text-xs col-span-3 p-5 pl-10"
        >
          <strong class="text-blue-800"
            >Thiết lập thời gian bắt đầu sự kiện</strong
          >
        </p>
        <div class="text-left pl-10 pt-2">
          <form id="timeForm">
            <label for="hours">Giờ: </label>
            <input
              type="number"
              id="hours"
              name="hours"
              min="0"
              max="23"
              class="h-8 mx-2"
              required
            />
            <label for="minutes">Phút: </label>
            <input
              type="number"
              id="minutes"
              name="minutes"
              min="0"
              max="59"
              class="h-8 mx-2"
              required
            />
            <label for="seconds">Giây: </label>
            <input
              type="number"
              id="seconds"
              name="seconds"
              min="0"
              max="59"
              class="h-8 mx-2"
              required
            />
            <br />
            <button
              type="submit"
              class="rounded-lg bg-blue-500 hover:bg-blue-700 duration-300 shadow-lg hover:shadow-2xl text-white py-1 px-4 my-4"
            >
              Xác nhận
            </button>
          </form>
        </div>
  `;
  get_startTime();
  set_startTime();
};

setminio_btn.onclick = () => {
  options_content.innerHTML = `
    <p
          class="2xl:text-3xl xl:text-2xl lg:text-xl md:text-lg text-xs col-span-3 p-5 pl-10"
        >
          <strong class="text-blue-800">MinIO configuration</strong>
        </p>
        <div class="text-left pl-10 pt-2">
          <form id="minioForm">
            <label for="endPoint">Endpoint: </label><br />
            <input
              type="text"
              id="endPoint"
              name="endPoint"
              placeholder="Nhập endpoint..."
              class="h-8"
              required
            />
            <br />
            <label for="accessKey">Access Key: </label><br />
            <input
              type="text"
              id="accessKey"
              name="accessKey"
              placeholder="Nhập access key..."
              class="h-8"
            />  
            <br />
            <label for="secretKey">Secret Key: </label><br />
            <input
              type="text"
              id="secretKey"
              name="secretKey"
              placeholder="Nhập secret key..."
              class="h-8"
            />
            <br />
            <label for="bucketName">Bucket Name: </label><br />
            <input
              type="text"
              id="bucketName"
              name="bucketName"
              placeholder="Nhập bucket name..."
              class="h-8"
              required
            />
            <br />
            <button
              type="submit"
              class="rounded-lg bg-blue-500 hover:bg-blue-700 duration-300 shadow-lg hover:shadow-2xl text-white py-1 px-4 my-4"
            >
              Xác nhận
            </button>
          </form>
        </div>
  `;
  get_minio();
  set_minio();
};

export function set_minio() {
  const form = document.getElementById("minioForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const end_point = document.getElementById("endPoint").value;
    const access_key = document.getElementById("accessKey").value;
    const secret_key = document.getElementById("secretKey").value;
    const bucket_name = document.getElementById("bucketName").value;

    fetchPostMinio(end_point, access_key, secret_key, bucket_name)
      .then(() => {
        alert("Cập nhật thành công!");
      })
      .catch((err) => {
        console.error("Lỗi cập nhật:", err);
        alert("Cập nhật thất bại.");
      });
  });
}

export function get_minio() {
  fetchGetMinio()
    .then((data) => {
      const endPoint = document.getElementById("endPoint");
      const accessKey = document.getElementById("accessKey");
      const secretKey = document.getElementById("secretKey");
      const bucketName = document.getElementById("bucketName");

      if (endPoint && accessKey && secretKey && bucketName) {
        endPoint.value = data.end_point;
        accessKey.value = data.access_key;
        secretKey.value = data.secret_key;
        bucketName.value = data.bucket_name;
      }
    })
    .catch((err) => {
      console.error("Lỗi lấy thông tin MinIO:", err);
    });
}
