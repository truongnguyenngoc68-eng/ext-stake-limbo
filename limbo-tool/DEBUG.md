# Limbo debug journal

Mở **Debug log / Ghi file local** trong panel, hoặc **Debug log** ở trang cài đặt.

1. Reload extension, F5 các tab Limbo để nạp observer mới từ đầu trang.
2. Bấm **Chọn file & cấp quyền đọc/ghi**, chọn file `.jsonl`.
3. Giữ trang Debug mở. File được append theo batch mỗi giây; journal IndexedDB trong extension tiếp tục ghi khi đóng trang Debug.
4. Sau khi mở lại trang Debug, bấm **Tiếp tục file đã chọn**; Chrome có thể yêu cầu cấp quyền lại.
5. **Xuất toàn bộ journal** tạo bản sao để đưa cho AI. Không chọn trùng file đang stream.

## Dữ liệu

- Snapshot mỗi 5 giây cho từng tab: trạng thái, config, wallet, profit/volume, số lượt, trạng thái/input game và các trường seed có `data-testid` chứa `seed` đang hiển thị.
- Thao tác người dùng trên game và tool, thay đổi cấu hình, lệnh panel, trước/sau ghi input và gửi Auto.
- Request/response Limbo qua fetch/XHR: variables, kết quả round trả về (bao gồm seed/hash/nonce khi có), lỗi network và GraphQL. Request/response dùng chung trace; cycle liên kết với lượt Auto.
- Request/response có seed/fairness qua fetch/XHR khi nhận diện được; không truy vấn thêm API, không suy đoán seed chưa công bố.
- WebSocket mở sau khi observer được nạp: open/send/receive/close/error, payload text/JSON. Payload nhị phân chỉ ghi loại và kích thước, có `unreadBinary: true`.
- Console và lỗi chưa bắt của trang game, content, panel, options, Debug và background; lỗi Telegram và vòng đời tab.
- Mỗi lỗi có stack tại điểm ghi log, stack gốc nếu có Error, snapshot và tối đa 80 sự kiện trước đó của cùng context. Toàn bộ chuỗi sự kiện đã ghi vẫn nằm riêng trong journal.

## Định dạng cho AI

Mỗi dòng là một object JSON: `schema`, `id`, `time` (UTC ISO), `epoch`, `receivedAt`, `session`, `source`, `version`, `tabId`, `frameId`, `event`, `level`, `trace`, `data`. Event từ MAIN world có thêm `data.pageTime`. Lỗi có `stack`, `snapshot`, `flow`; lỗi gốc ở `data.error.stack` khi trình duyệt cung cấp.

Lọc theo tab/session/cycle/trace, đối chiếu các event input/output rồi đọc snapshot ở event lỗi. `id` là thứ tự journal nhận log, không bảo đảm thứ tự phát sinh giữa các context. Sau crash đúng lúc append có thể lặp id: deduplicate theo id trong cùng journal.

## Giới hạn thực tế

- Quyền file qua File System Access API, không có quyền filesystem tùy ý. Cần Chrome hỗ trợ picker; chọn file là thao tác người dùng. Không cần native app.
- Journal không tự xóa; manifest xin `unlimitedStorage`. Vẫn phụ thuộc dung lượng đĩa. Lỗi journal/file được báo qua `limboDebugHealth` và trang Debug. Gỡ extension/xóa dữ liệu extension sẽ mất journal.
- Ghi file đóng batch rồi mới cập nhật cursor. Lỗi file không xóa journal; bấm tiếp tục sau khi khắc phục. Journal không phải transaction chung với game nên không bảo đảm giữ những event cuối cùng khi tab/browser bị kill trước ACK.
- Client retry khi journal không ACK; queue RAM tối đa 2.000 event/context, MAIN buffer trước handshake tối đa 2.000. Vượt giới hạn có event `logger.dropped`/`buffer.dropped`. Event đang nằm trong RAM mất khi context bị hủy. Tab nền có thể bị Chrome throttle/suspend, snapshot không bảo đảm đúng 5 giây.
- Bản ghi giới hạn độ sâu 12, chuỗi 100.000 ký tự, mảng 2.000 phần tử và object 500 khóa. Phần vượt giới hạn có marker. Stack network WebSocket gốc không được Chrome cung cấp; log ghi stack tại điểm xử lý và code/reason nếu có.
- Observer không đọc được socket trong worker/iframe riêng, kết nối tạo trước observer, hoặc request có body không phải chuỗi JSON. Dữ liệu trang gửi qua bridge là dữ liệu quan sát, không phải bằng chứng được xác thực.
- Che các trường xác thực phổ biến (token, authorization, cookie, password, API key), URL Telegram và Bearer; seed dùng để kiểm chứng round được giữ. Payload lạ có thể chứa thông tin riêng tư dưới tên không nhận diện: kiểm tra file trước khi chia sẻ.

Chạy kiểm tra: `node --test tests/limbo-*.test.mjs`.
