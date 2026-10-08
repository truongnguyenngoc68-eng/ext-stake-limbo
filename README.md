## v1.0.50 — Icon trạng thái

Icon Chrome và trạng thái trong dashboard đồng bộ: xám chưa chạy, xanh đang chạy, đỏ lỗi/mất kết nối, vàng Pause/đang Pause. Giữ giao diện widget, lịch sử 50.000 vòng và dữ liệu phiên.

## v1.0.49 — Bố cục widget đã duyệt

Áp dụng giao diện widget, tùy chỉnh ẩn/hiện và thứ tự. Chuỗi thua và kết quả gần đây nằm cạnh nhau khi sidebar rộng từ 520px; sidebar nhỏ tự xếp dọc để giữ chữ dễ đọc. Lưu tối đa 50.000 vòng đã quan sát với lọc, phân trang, xuất JSON. Giữ tiến độ cược và cơ chế Pause/Continue/F5.

## v1.0.48 — Widget live

Chia dashboard thành widget kiểu iPhone: tổng quan, tiến độ cược, chuỗi thua, kết quả & lịch sử. Nút Tùy chỉnh cho phép ẩn/hiện, đổi thứ tự và khôi phục bố cục mặc định; lưu riêng với dữ liệu cược. Giữ kho lịch sử 50.000 vòng và các tính năng phiên hiện có.

## v1.0.47 — Lịch sử vòng live

Thêm 20 kết quả gần đây dưới bảng chuỗi thua, thống kê 100 vòng gần nhất, lịch sử bền vững tối đa 50.000 vòng đã quan sát. Lọc hệ số, phân tích hit theo target, phân trang 100 vòng và xuất JSON. Dữ liệu độc lập với Reset cược, đánh dấu khoảng gián đoạn; không tải ngược các vòng chưa từng quan sát. Tự nhập dữ liệu quan sát còn trong checkpoint cũ.

## v1.0.46 — Live Dashboard

Áp dụng bố cục đã chọn: giao diện tối dịu, hai bảng live, W/L dạng số, tỷ lệ L / (W × Target), tiến độ theo bậc và điểm báo khi chuỗi thua chạm kỷ lục. Chuyển quan sát số dư và chẩn đoán vào Công cụ. Chỉ đổi trình bày; giữ dữ liệu và cơ chế cược/khôi phục.

## Cập nhật 1.0.45

Thêm bảng CHUỖI THUA LIVE ngay dưới tiến độ: Target, thua hiện tại, thua dài nhất. Dùng bộ đếm cược đã chốt từng bảng, tự cập nhật và sắp target tăng dần. Thắng xóa chuỗi hiện tại, giữ chuỗi dài nhất; vòng Chờ không tăng chuỗi.

## Cập nhật 1.0.44

Tỷ lệ = Loss / (Win × Target), làm tròn 3 chữ số thập phân. W=0 hiển thị —. Ví dụ 1473/(10×90)=1.637.

## Cập nhật 1.0.43

Cột L/W = số lần thua / số lần thắng, làm tròn một chữ số thập phân, đơn vị lần. W=0 hiển thị —. Không hiển thị phần trăm.

## Cập nhật 1.0.42

Tỷ lệ là số vòng phiên / (target × số lần thắng), hiển thị phần trăm. Ví dụ 1480/(90×9) = 182.7%. W=0 hiển thị —.

## Cập nhật 1.0.41

Tiến độ dạng bảng gọn: Target, Bậc/Vòng, W/L, tỷ lệ thắng W/(W+L), P/L, lãi nếu thắng. Target tự sắp tăng dần chỉ trên giao diện, giữ ID và tiến độ. Bấm hàng mở chi tiết và nút chỉnh bậc. Không có cược đã chốt thì tỷ lệ hiển thị —.

## Cập nhật 1.0.40

Hiển thị Lãi nếu thắng ở mỗi bảng tiến độ, cạnh mức cược và target hiện tại: amount × (actualTarget − 1), lãi ròng riêng cược đó, đã trừ tiền cược. Bậc Chờ hiển thị 0. Không cộng/trừ P/L các vòng trước.

## Cập nhật 1.0.39

Bỏ hoàn toàn Stop Loss theo yêu cầu. Không áp dụng ngưỡng lỗ từ cấu hình cũ; bỏ ô Stop Loss. Phiên cũ dừng vì Stop Loss được mở khóa để Continue/Start mà giữ lịch sử, P/L và bậc. Các giới hạn khác vẫn theo cấu hình.

## Cập nhật 1.0.38

Side Panel tự thử kết nối lại liên tục với khoảng chờ tăng dần tối đa 10 giây, không hết hạn sau 45 giây. Số dư hiển thị đứng yên không tự dừng phiên nếu còn lệnh vòng tiếp theo và nút Stake Auto vẫn đang chạy; ghi cảnh báo và tiếp tục quan sát. Số dư không đọc được hoặc Auto đã dừng vẫn báo lỗi. Tiến độ đổi nền đen, viền và thanh đỏ, chữ sáng tương phản cao.

## Cập nhật 1.0.37

Sửa lỗi đồng bộ khi Cược Của Tôi bị thu gọn: mở rộng danh sách và chờ DOM trước khi đọc/xóa/đổi cấu hình cược. Không reset lịch sử, bậc hay thống kê phiên. Xác minh trên Chrome đã đăng nhập: danh sách bị gỡ khỏi DOM khi thu gọn, mở lại xuất hiện đủ 9 dòng.

## Cập nhật 1.0.36

Bỏ banner nổi Bản tiến độ cuối / CHỜ ĐỐI CHIẾU trên trang Stake. Giữ cơ chế lưu tiến độ hiện có.

## Cập nhật 1.0.35

Đồng bộ số dư quan sát vào ô Số dư trang ngay cả khi chưa có phiên Auto. Hiển thị trạng thái nguồn vòng và độ dài lịch sử. Đã xác minh trực tiếp trên Chrome: số dư 134.58551021 USDT, nguồn vòng đang cập nhật. 22 kiểm thử phát hành qua; chưa thực hiện cược thật.

## Cập nhật 1.0.34

Trace trực tiếp Chrome xác nhận lỗi Cannot access contents of the page tại bước chèn script. Thêm host_permissions cho https://stake1073.com/* và https://www.stake1073.com/* để bộ quan sát có quyền đọc trang này. Tên miền khác vẫn dùng activeTab.

## Cập nhật 1.0.33

Side Panel không yêu cầu Chrome trả URL tab để kết nối. Bộ nạp kiểm tra location trực tiếp trong tab trước khi chèn bộ quan sát. Giữ lỗi truy cập/kênh cụ thể để chẩn đoán. Chưa xác nhận nguyên nhân trên trình duyệt thực tế.

## Cập nhật 1.0.32

Cho phép kết nối bộ quan sát ở chế độ Thủ công, không yêu cầu ô target của Auto. Hiển thị lỗi kết nối cụ thể. Bộ đọc hiện dùng DOM, chưa thu thập network/WebSocket.

## Cập nhật 1.0.30

F5 giữ UI hiện tại và tự thử kết nối khi DOM sẵn sàng. Tiến độ được ghi ngay vào journal của tab và chuyển cho background ghi bền vững, có revision để tránh snapshot cũ ghi đè. Khôi phục lịch sử vòng/lệnh và trạng thái bậc; Start khi đã có phiên chỉ tiếp tục, không tạo phiên về 0. Khi bật Tự tiếp tục sau F5, tự tiếp tục phiên đang chạy sau khi nguồn vòng và số dư sẵn sàng.

## Cập nhật 1.0.29

Bỏ điều kiện bắt buộc có receipt tổng cược trong pha quay. Khi có đúng kết quả vòng tiếp theo và anchor khớp, cập nhật tiến độ theo kế hoạch đã gửi; người dùng tự đối chiếu và điều chỉnh nếu Stake không nhận cược. Continue sau khi dừng cho phép bỏ trạng thái chưa đối chiếu, lưu dấu vết audit, giữ tiến độ đã ghi nhận và không tự ghi kết quả cược cũ. Reset cũng cho phép xóa trạng thái chờ sau khi đã dừng.

## Cập nhật 1.0.28

Thêm tùy chọn Tự tiếp tục sau F5 (mặc định bật theo yêu cầu). Chỉ tự tiếp tục phiên trước đó đang chạy trên cùng origin; phiên đã Pause không tự chạy. Cược đã có receipt được đối chiếu khi còn đúng một kết quả mới sau anchor; thiếu receipt, thiếu anchor hoặc bỏ lỡ nhiều vòng thì yêu cầu đối chiếu. Vẫn gồm bản sửa Pause 1.0.27.

## Cập nhật 1.0.27

Pause kiểm tra lại trạng thái native ở mỗi nhịp, thay vì chỉ kiểm tra một lần và yêu cầu cửa sổ còn ít nhất 4 giây. Khi Stake xác nhận dừng, tổng cược bằng 0 và cửa sổ cược mở, hủy lệnh vòng kế tiếp chưa có receipt và chuyển sang Continue. Lệnh đã có receipt vẫn chờ kết quả. Mọi đường dừng đều xóa trạng thái đang Pause.

## Cập nhật 1.0.26

Lưu toàn bộ tiến độ/bậc/thống kê và tùy chọn vào chrome.storage.local; khôi phục ở trạng thái Pause sau F5 hoặc mở lại Chrome. Nút Pause đổi thành Continue để tiếp tục. Hủy trạng thái chờ vòng native kế tiếp khi Stake đã xác nhận dừng, còn cửa sổ cược và tổng cược bằng 0. Cược chưa xác nhận trước khi reload được giữ làm dữ liệu đối chiếu, không tự tiếp tục.

## Cập nhật 1.0.25

Không cố định tên miền. Người dùng đăng nhập và mở màn Slide, sau đó bấm biểu tượng extension. Extension sử dụng activeTab + scripting để kiểm tra đường dẫn /casino/games/slide và DOM ô cược/target rồi kết nối Side Panel với tab đó. Không tự bắt đầu cược. Khi đổi sang tên miền khác, bấm biểu tượng extension trên tab mới để cấp quyền cho tab.

## Cập nhật 1.0.24

Hỗ trợ stake1073.com và www.stake1073.com bên cạnh stake1022.com. Đồng bộ quyền truy cập, content script, kết nối Side Panel và xác thực nguồn Telegram. Đã inspect DOM công khai tại stake1073.com/vi/casino/games/slide; chưa đăng nhập tài khoản trong trình duyệt kiểm tra. Reload extension, cho phép chạy trên tên miền mới nếu trình duyệt yêu cầu, F5 tab Stake rồi mở lại Side Panel.

## Cập nhật 1.0.23

Sửa đọc số dư crypto có dấu phẩy thập phân (134,69951021 = 134.69951021). Bộ đọc được dùng chung cho Auto và checkpoint. Thêm Start / Pause / Reset: Pause giữ tiến độ và chờ cược đã gửi được xác nhận; Start tiếp tục phiên đã Pause; Reset chỉ khi đã dừng và không còn cược chờ, đưa tiến độ/thống kê về đầu và không tự chạy. Sau F5 không tự tiếp tục phiên cũ.

## Cập nhật 1.0.22

Bấm biểu tượng extension để mở Side Panel gốc của Chrome/Edge. Panel kết nối với tab Stake Slide đang được chọn trong cùng cửa sổ; không chèn giao diện đè lên trang. Reload extension rồi F5 trang Stake sau khi cập nhật.

## Cập nhật 1.0.21

Khôi phục sidebar trên trang Stake như bản 1.0.19. Bấm biểu tượng extension để mở/đóng sidebar. Không dùng kết nối tab riêng của 1.0.20. Sau khi reload extension cần F5 trang Stake.

## Cập nhật 1.0.20

Bấm biểu tượng extension để mở tab riêng, kết nối với trang Stake Slide đang mở. Sau mỗi thay đổi phải tăng version trong manifest, package và nhãn giao diện.

# Slide Lab 1.0.19 — bản đang sử dụng

Bản chuẩn được nhập từ `slide-lab-v1.0.19-observer-update`. Các tệp JavaScript/HTML/CSS tại thư mục gốc là bản phát hành đang sử dụng.

Chạy `npm run build`, sau đó chọn thư mục `dist` bằng **Load unpacked** trong Chrome/Edge. Tắt các bản Slide Lab cũ và tải lại trang sau khi cập nhật.

`src/`, cấu hình Vite và các bài kiểm thử TypeScript được giữ để tham khảo mã nguồn cũ; chúng chưa đồng bộ với bản 1.0.19. Build hiện đóng gói trực tiếp bản chuẩn. `npm test` chỉ kiểm thử mã nguồn cũ.

telegram-editor.js được giữ từ thư mục hiện tại vì manifest mới vẫn tham chiếu tệp này nhưng gói được gửi không kèm nó.

## Tài liệu cũ (tham khảo)
# Stake Slide Lab — Auto Bet (experimental v1.0.10)

Extension Chrome/Edge Manifest V3, Vue 3 + TypeScript, dành cho `https://stake1022.com/vi/casino/games/slide`. Giao diện thường, phóng to trên trang và HTML fullscreen dùng cùng bộ đọc DOM. Không dùng tọa độ chuột.

## Cài bản đã build

1. Giải nén ZIP, mở `chrome://extensions` (Edge: `edge://extensions`).
2. Bật **Developer mode / Chế độ nhà phát triển**.
3. Bấm **Load unpacked / Tải tiện ích đã giải nén**, chọn thư mục `dist` có `manifest.json`.
4. Tải lại trang Stake Slide, ghim biểu tượng extension và bấm để mở bảng.
5. Trong màn hình Cược: bật các bảng cần dùng; chỉnh mức, target và số vòng tại mỗi bậc; lưu.
6. Trong màn hình Cược: chọn ô số dư trên thanh đầu trang, nhập mã đồng đang dùng, giới hạn mỗi vòng, tổng tiền đặt và số lượt. Chọn hiển thị tiền theo đơn vị crypto trên Stake, dừng Auto sẵn có trên trang. Tự bấm **Bắt đầu cược thật** khi muốn chạy.

Vốn ban đầu là **ngân sách phiên do bạn nhập**, không phải số dư ví được đọc tự động. Mức cược là số lượng của đồng đã chọn (ví dụ USDT). Không hỗ trợ ô nhập tiền pháp định `$` vì quy đổi có thể làm sai mức trong bảng.

## Đúng quy trình xóa → thêm lại khi tăng bậc

- Mỗi bảng có bậc riêng, cùng dùng ngân sách phiên.
- `Số vòng` là số lượt ở bậc đó khi chưa thắng, không phải số tiền hoặc số thứ tự vòng.
- Thua: tăng bộ đếm; đủ số vòng → chuyển bậc tiếp theo.
- Thắng: về bậc 1, xét lại điều kiện vào chuỗi.
- Target riêng tại bậc để trống thì dùng target chung của bảng.
- Action `Chờ`: không cược, chỉ đếm vòng để chuyển bậc.
- Khi mức hoặc target đổi: xóa danh sách cược cũ trong **Cược Của Tôi**, thêm lại toàn bộ các dòng cần cho vòng tiếp theo; kiểm tra mức và target của từng dòng trước khi Start.
- Nhiều bảng dùng cùng target trong cùng vòng sẽ làm tool dừng để tránh Stake tự gộp thành mức khác.
- Hết bảng: dừng target / duy trì bậc cuối / về bậc 1 theo cấu hình.

Khi bật **Giữ Auto khi mức / target không đổi**, tool đặt **Số Cược = 0** trên Stake để native Auto chạy liên tục. Không Start lại giữa các vòng khi danh sách mức/target vẫn khớp. Khi thắng, vào thêm target, đổi mức/target hoặc chuyển sang Chờ, tool dừng native trước, xóa/thêm danh sách nếu cần rồi Start cấu hình mới. Tắt giữ Auto → đặt một lượt mỗi lần. Các giới hạn mỗi vòng, tổng tiền đặt và lượt phiên: **0 = tắt giới hạn đó**. Ngân sách, stop loss/take profit, hết bảng và kiểm tra kết nối vẫn áp dụng. Khi extension bị đóng/gỡ/crash giữa chừng, native Số Cược = 0 có thể còn chạy; kiểm tra và dừng trực tiếp trên Stake nếu cần.

Ô mức/giới hạn dùng bước nhập 0.001, không tự thay mức bạn đã lưu. Có thể nhập mức nhỏ hơn theo đơn vị đồng; ledger giữ tối đa 8 số thập phân. Mốc x4.000.000 được hỗ trợ cho cả bảng và bậc.

Trước khi bắt đầu, bấm **Chọn số dư trên trang**, rồi bấm trực tiếp vào con số trên thanh đầu trang Stake. Số dư phải cùng đơn vị crypto với tiền cược. Tool đọc ô này sau mỗi vòng đã xác nhận có cược. **3 vòng liên tiếp số dư không đổi → dừng Auto và kiểm tra mạng trình duyệt, trạng thái game, danh sách cược, khả năng đọc số dư**. Đây là dấu hiệu cần kiểm tra, không phải bằng chứng chắc chắn mất kết nối. Ô không đọc được cũng làm dừng. Không tự đặt lại cược khi trạng thái chưa rõ; kiểm tra rồi chủ động bắt đầu phiên mới.

## Theo dõi và dừng

- Auto chạy trong content script: đóng bảng điều khiển vẫn chạy. Mở lại để xem trạng thái.
- **Dừng Auto Bet** dừng tool và cố bấm Stop trên Stake. Lệnh đã được Stake nhận có thể vẫn hoàn tất; không có chức năng hủy ngược cược đã chấp nhận.
- Tải lại trang, đóng tab, mất dữ liệu vòng, xác nhận thao tác không rõ, vượt giới hạn hoặc nguồn game gián đoạn → không tự khởi động lại.
- Dùng Web Lock để tránh hai phiên của extension chạy đồng thời ở hai tab trên cùng origin.
- Không thay đổi cấu hình trên trang hoặc bật Auto Stake bằng tay trong lúc tool chạy. Nếu tool báo không xác nhận được Stop, kiểm tra trạng thái nút trên Stake.
- Dữ liệu DOM cũ → mới, mỗi vòng có ID riêng. Không tính hai lần khi hệ số trùng nhau.
- Lãi/lỗ được tính theo các mức đã gửi và kết quả vòng; **không phải đối soát số dư/API giao dịch**. Tool chỉ chuyển bậc khi quan sát được tổng cược trên game trong pha đang quay và có đúng một kết quả vòng kế tiếp.
- Stop loss / take profit tính sau khi kết thúc vòng; lỗ thực tế của vòng có thể vượt ngưỡng stop loss.
- Việc tab bị Chrome giảm tần suất khi chạy nền có thể làm tool dừng. V1 không đảm bảo chạy không gián đoạn qua mất mạng, ngủ máy hoặc thay đổi giao diện.

## Paper betting / backtest

Tab Mô phỏng có phiên giả lập riêng. Tab Backtest nhận số từ cũ → mới, một hệ số mỗi dòng (dấu `.` hoặc `,`), mảng JSON số hoặc file vòng JSON đã xuất. Tối đa 100.000 vòng. Điều kiện dùng các kết quả **trước** vòng đang xét; không dùng kết quả tương lai để quyết định. Lịch sử không dự đoán được vòng sau.

Cấu hình lưu cục bộ trong extension. Cấu hình, giới hạn Auto, ô số dư đã chọn, lịch sử và thống kê phiên được tự lưu trong chrome.storage.local và khôi phục sau F5 hoặc mở lại trình duyệt. Phiên Auto và mô phỏng khôi phục ở trạng thái đã dừng; bấm Bắt đầu để tạo phiên mới. Lưu tối đa 5.000 vòng quan sát, 10.000 lệnh mô phỏng; thống kê vẫn tính toàn bộ vòng đã xử lý.

## Phạm vi kiểm chứng

Bộ đọc lịch sử (`data-past-game-id`, `data-last-game-index`), input và nút Add trên DOM Stake được đối chiếu trực tiếp ngày 07/10/2026. Danh sách có các nút trash được đối chiếu từ ảnh bạn cung cấp. Các thao tác xóa/thêm/Start được kiểm thử trên DOM mô phỏng cùng quy trình, **chưa được kiểm thử đặt cược tiền thật trên tài khoản Stake**. Bản này cần kiểm tra thực tế từng chức năng trước khi dùng để treo dài; không thể bảo đảm DOM khi đăng nhập giống hoàn toàn phiên công khai.

Đây là bản triển khai mới sau khi kiểm tra cấu trúc ZIP CSGOGem bạn gửi. Không tái sử dụng WS event CSGOGem hay phần gửi dữ liệu đến API của tool cũ. Có trang Tín hiệu / Telegram và API Telegram chính thức khi bạn bật. Không đọc token/cookie của Stake, không yêu cầu `<all_urls>`.

## Build mã nguồn

Node.js 24+ để build và chạy các test TypeScript. Có thể dùng npm hoặc yarn.

```bash
npm ci
npm run build
npm test
```

```bash
yarn install
yarn build
yarn test
```

`npm run dev` mở giao diện standalone để thử paper betting. Auto Bet thật chỉ chạy trong extension trên Stake.

- `src/model.ts`: cấu hình, kiểm tra đầu vào.
- `src/engine.ts`: bảng bậc, điều kiện và ledger cố định 8 số thập phân.
- `src/adapter.ts`: đọc vòng đã công bố và phát hiện khoảng trống ID.
- `src/stake-dom.ts`: đọc, xóa, thêm, kiểm tra, Start/Stop Stake.
- `src/live.ts`: runner Auto, giới hạn, chống gửi trùng, theo dõi kết quả.
- `src/content.ts`: giao tiếp panel, vòng lặp và fullscreen.
- `src/App.vue`: giao diện Việt, cấu hình, backtest, Telegram và trạng thái.
- `src/signals.ts`: tín hiệu Big Hit / đủ chuỗi, định dạng tin ngắn.
- `src/background.ts`: Telegram, lịch sử, kiểm tra nguồn yêu cầu và chống gửi trùng.
- `tests/`: chiến thuật, mất dữ liệu, ngân sách, chống gửi trùng và DOM xóa/thêm.

Nếu Stake thay DOM, sửa selector trong `src/stake-dom.ts` / `src/adapter.ts`, build lại và bấm Reload extension. Không sửa file trong ZIP CSGOGem gốc.

## Trang Tín hiệu / Telegram

Trong tab Telegram, bấm **Mở trang riêng** để xem dashboard ở một tab extension riêng. Trang này chạy cục bộ, không phải website được publish lên Internet. Giữ tab Stake Slide mở để có dữ liệu; chỉ mở dashboard không tự mở Stake.

1. Tạo bot bằng @BotFather trên Telegram. Không nhập token vào chat với trợ lý.
2. Nhập Bot Token và Chat ID / @username kênh trực tiếp trong extension. Thêm bot vào nhóm/kênh và cấp quyền gửi tin; chat riêng phải nhắn /start cho bot.
3. Bật gửi Telegram, chọn loại tin, bấm Lưu. Chrome chỉ yêu cầu quyền kết nối `api.telegram.org` khi bật.
4. Bấm Gửi tin thử. Đây là thao tác do bạn thực hiện từ máy mình; bản build chưa gửi thử tới một chat thật.
5. Chỉnh ngưỡng Big Hit và điều kiện chuỗi; lưu. Tín hiệu vòng chạy ngay cả khi Auto Bet tắt.

Mẫu gọn theo ảnh:

```text
💰 [STAKE] R123 · x2.26 · vốn~32.31
• 90: 1/6 - 12/360v
• 450: 1/6 - 12/438v
```

```text
🎉 [STAKE] THẮNG · 450
x1326.21 / x450 · cược 0.01
P/L vòng: +4.49 · tổng: 8.97
Vốn~108.97 · reset bậc 1
```

```text
🔔 [STAKE] BIG HIT
x1326.21 · sau 7 vòng · ngưỡng ≥x90
```

R là thứ tự tool quan sát trong phiên trang, không phải số vòng chính thức của Stake. `bậc/tổng bậc - lượt tại bậc/giới hạn vòng` là cú pháp dòng bảng. Vốn~ là ngân sách tính toán; không tự nhận nó là số dư ví. Khi đã chọn ô số dư và Auto đang chạy, tin trạng thái dùng “số dư” đọc từ trang thay cho “vốn~”. Nếu chưa quan sát được lần Big Hit trước, số vòng chờ là cận dưới và có dấu ≥.

Gửi văn bản thuần, tối đa 1.000 ký tự, không bật MarkdownV2 nên không cần escape dấu chấm/dấu cộng. Worker giới hạn khoảng cách gửi ít nhất 1,1 giây; chỉ gửi một lần cho mỗi ID tín hiệu. Không tự thử lại khi timeout vì không chắc tin trước đã được Telegram nhận hay chưa. Token giữ trong storage extension (không mã hóa), không nằm trong file cấu hình chiến thuật hay xuất tín hiệu. Lịch sử giữ tối đa 500 tín hiệu, hiển thị 100 mới nhất. Các giới hạn chống trùng chỉ bao phủ lịch sử còn lưu.

Gửi tới Telegram có thể gồm kết quả vòng, target, mức cược và lãi/lỗ tính toán của phiên, đúng các loại bạn chọn. Kiểm thử worker dùng API giả lập, không gửi dữ liệu hoặc token thật ra mạng.


## Thống kê theo ảnh mẫu

Tab **Thống kê** có ma trận Hits / Current Gap / Avg Gap / Max Gap / Ratio theo ngưỡng, thêm/xóa ngưỡng, cửa sổ 100 / 500 / 1.000 / toàn phiên, dải màu 300 vòng, Big Hits, Recent Rounds và thống kê từng bảng chiến thuật. Bấm **Mở rộng / thu gọn** để xem bảng rộng trên giao diện game phóng to. GAP đếm số vòng không đạt mốc giữa hai hit, không gồm hai đầu. Avg/Max chỉ tính khoảng hoàn tất, chưa có hit thì Current Gap là cận dưới ≥. Thời gian là lúc tool đọc DOM, không phải thời gian máy chủ được xác minh. Không có dữ liệu whale/người chơi/tổng cược toàn sàn từ nguồn này.


## Sửa giao diện v1.0.1

Nút mô phỏng được chuyển vào tab Mô phỏng riêng. Các tab chính hiển thị trạng thái Auto thật; số dư chưa đọc hiện “Chưa đọc”, không lấy 100 vốn giả lập làm ví Stake. Thống kê chiến thuật chọn nguồn Auto/Mô phỏng tường minh và không tự lấy số liệu giả lập thay Auto. Kiểm tra ngay trước khi Start nếu chưa chọn số dư hoặc tổng mức đầu vượt giới hạn mỗi vòng. Ví dụ bật hai bảng .001 và .01 thì tổng là .011; giới hạn .01 sẽ chặn.

Cập nhật: xuất cấu hình JSON cũ trước; chép đè nội dung dist vào đúng thư mục extension đã cài, bấm Reload trong chrome://extensions, F5 trang Stake. Giữ nguyên thư mục để giữ ID extension và cấu hình.


## Giao diện đơn giản v1.0.2

Màn hình đầu Cược chứa nút Bắt đầu/Dừng cược thật, chọn số dư, mã đồng và bảng target/bậc. Giới hạn Auto và ngân sách phiên được thu gọn. Mọi thống kê, mô phỏng, backtest, lịch sử, Telegram và hướng dẫn nằm sau nút Thống kê & công cụ. Màn hình đầu không có nút bắt đầu mô phỏng.

Bộ đọc thời gian v1.0.2 hỗ trợ countdown ở các wrap/nested span khác nhau trong giao diện đăng nhập. Trạng thái chờ hiển thị số giây tool đọc hoặc lý do chờ điều kiện. Không khẳng định đã xác minh DOM của tài khoản người dùng chỉ từ ảnh.


## v1.0.3

Thẻ Tiến độ chiến lược Live nằm ngay màn hình Cược: bậc, lượt tại bậc, tiến độ chuỗi, mức/target thực, W/L, P/L và lý do chờ từng bảng. Bộ đọc xác nhận cược không còn yêu cầu input mang thuộc tính disabled hoặc amount nằm đúng lớp content; vẫn cần tổng cược trong status box khớp ở pha quay và một kết quả vòng liên tiếp. Chưa xác minh thay đổi này trên tài khoản Stake thực; nếu không xác nhận được, tool vẫn dừng thay vì suy đoán vòng.


## v1.0.4 — xác nhận trạng thái / chẩn đoán

Thêm bộ đọc nhãn tổng cược khi status box không có data-testid: cần một số tiền duy nhất, loại tiêu đề danh sách có cả số dòng lẫn số tiền. Vẫn kiểm tra pha quay và native Stop, không tính dựa trên danh sách cược đơn thuần. Nút Xuất chẩn đoán ghi tối đa 80 mốc submit/receipt/result/stop: thời gian, ID/index/hệ số vòng, ô tổng cược, countdown, danh sách mức, giới hạn native và trạng thái phiên. Không gồm cookie, token Stake hay Telegram. File có mức cược và số dư nên chỉ gửi cho bên hỗ trợ bạn chọn. Việc tool tự dừng chưa được giải quyết chắc chắn cho DOM tài khoản thực; bản này giúp xác định nhánh lỗi thay vì bỏ điều kiện xác nhận.


## v1.0.5 — lỗi đã có dữ liệu thực tế

File chẩn đoán v1.0.4 cho thấy submit nativeRounds=0 thành công, một kết quả mới có ID đúng, nhưng receiptSeen=false và statusAmounts có 5 (số dòng cược), 0. Khi kết quả xuất hiện, status box đã chuyển sang “người chiến thắng”. Bộ đọc cũ lấy data-ds-text đầu tiên (có thể là nhãn), rồi fallback toàn trang nên lẫn số lượng dòng 5 vào số tiền. Bản sửa đọc toàn văn bản status box theo nhãn+đúng một số tiền; có status box thì không fallback sang sidebar khi box chuyển sang winner. Nếu không có testid, loại sidebar/my-bets/header khỏi tìm kiếm. Cho phép ghi nhận số tiền đúng khi Auto đã được xác nhận đang chạy, kể cả trước pha quay; không đợi countdown=0 khiến bỏ lỡ trạng thái xác nhận trước khi box chuyển nhãn. Kiểm thử hồi quy nhãn đứng trước tiền và 1.000 vòng/5 target với một lần Start; đây vẫn là kiểm thử mô phỏng, không phải chạy 1.000 vòng trên tài khoản thật.


## v1.0.6 — tối ưu diện tích màn hình cược

Thu nhỏ header/nav; gộp nút Start/Stop với trạng thái. Chẩn đoán chuyển thành nút ↧ ở header. Thẻ tiến độ gọn, vẫn giữ đủ mức tiền (8 số thập phân), target thực, bậc, vòng, W/L, P/L và lý do chờ. Cấu hình chiến thuật gộp trong khối đóng/mở, tự thu khi Auto chạy; có thể mở để xem. Điều kiện vào chuỗi chỉ hiện các ô khi bật. Bỏ footer, mô tả lặp, nút Lưu trùng. Không sửa logic đặt cược ở bản này.


## v1.0.7 — bộ đếm bậc / trần vòng

Tiến độ chỉ ghi “Bậc N: đã dùng/giới hạn bậc”; dòng dưới ghi số ván đã cược của bảng (W+L), không hiển thị tổng lượt toàn bộ ladder như 501/600 vì dễ nhầm với bậc hiện tại. Ô trần vòng hiển thị tổng cược vòng tới; nếu chuyển bậc vượt trần sẽ ghi từng target/mức trong lý do dừng. Không tự tăng trần do người dùng đặt. Kiểm thử chuyển bậc sau 1 lượt sang bậc 100 lượt: dừng native, cấu hình lại rồi giữ Auto; thêm kiểm thử dừng vì mức mới vượt trần.


Bổ sung v1.0.7: nút −/+ bậc Live cho từng bảng. Yêu cầu khi đã có cược được xếp sau kết quả của ván đó, không đổi cách tính ván đã nhận. Chỉ bảng được chọn về lượt 0 tại bậc mới; mức/target đổi thì native dừng để đồng bộ lại. Nút chỉ hoạt động khi Auto chạy. Trước Start kiểm tra ô cược chưa bị khóa, nút Start sẵn sàng và còn ≥2,5 giây; kiểm tra lại sau 60ms. Nếu khóa trước click thì chờ cửa sổ mới; nếu click đã xảy ra nhưng xác nhận không rõ vẫn dừng, không click lại. Thời gian đọc từ countdown Stake, không dùng setInterval 10s để đoán ván.

Cấu hình bậc mới khi ô game còn khóa cũng chờ cửa sổ kế tiếp, không kết thúc phiên và không ghi vòng giả. Trần/vòng vẫn áp dụng cho tổng tất cả target: x90 .03 + hai bảng .001 = .032 sẽ bị trần .01 chặn; đây là giới hạn do người dùng đặt, không phải mất mạng.


Native Auto v1.0.7: nhận cả nút “Hủy” và “Dừng Cược Tự Động” là trạng thái Auto đã bật. Cùng mức/target: giữ Số Cược=0, không nhập hay Start lại qua các vòng. Không cho submit lặp khi Auto đã bật hoặc nút đã đổi trong lúc chuẩn bị. Khi cần dừng để đổi danh sách, chỉ click một lần rồi chờ nút Start trở lại; các yêu cầu dừng đồng thời dùng cùng một lần xác nhận. Không lặp click trong thời gian chờ khiến nút toggle bật/tắt ngược. Kiểm thử hồi quy trạng thái Hủy→Dừng, xác nhận dừng chậm và submit lặp.


## v1.0.8 — nhân đôi bảng và rà soát Auto

Nút Nhân đôi sao chép toàn bộ điều kiện, mức, target riêng, số vòng và action của bảng đang chọn; ID mới và bản sao chưa kích hoạt. Chỉnh target rồi bật/Lưu để tránh hai bảng cùng target bị gộp. Bản sao độc lập, sửa không đổi bảng gốc. Tối đa 20 bảng. Đang Auto: cấu hình bị khóa.

Sửa bộ đọc receipt: tiếp tục đọc trong thời gian chờ kiểm tra số dư, thay vì ngưng 800ms và có thể bỏ lỡ xác nhận. Kiểm tra mạng game trong lúc giữ Auto. Loại ID đã biết khỏi batch trước khi kiểm tra mất vòng. Chặn Start nếu tổng cược vượt số dư đọc trên trang. Xóa target riêng của bậc trả về target chung, không tạo cấu hình rỗng không hợp lệ.

Kiểm chứng: toàn bộ test chiến thuật, số thập phân, chuyển bậc, giữ Auto, Cancel/Stop, thiếu receipt, mất vòng, ngân sách, số dư, thống kê và Telegram giả lập. Có test Live + DOM qua nhiều vòng và đổi tiền: Start chỉ một lần khi cùng mức, một lần dừng/xóa/thêm khi mức đổi. Giao diện build được chạy trong jsdom để thử nhân đôi, sửa/lưu độc lập, xóa target riêng và mở từng tab. Lệnh kiểm tra giao diện: `npm run build && node scripts/verify-ui.mjs`.

Các kiểm thử này không phải chạy trên tài khoản đăng nhập hoặc kiểm thử cược tiền thật; không xác nhận khả năng treo dài trên môi trường thực. Lãi/lỗ vẫn là tính toán từ receipt DOM và kết quả vòng, không đối soát lịch sử giao dịch của Stake.


## v1.0.9 — chỉnh chiến thuật khi đang Auto

Mở Cấu hình chiến thuật, chỉnh bảng rồi Lưu trong lúc Auto chạy. Có thể chỉnh mức, target chung/riêng, số vòng, điều kiện, action, bật/tắt, thêm/xóa/nhân đôi bảng. Cấu hình không tự đóng theo mỗi cập nhật Live. Bản lưu được xếp hàng: ván đã nhận cược luôn tính theo chiến thuật cũ; sau kết quả mới áp dụng bản lưu gần nhất. Không đổi tiền/target đang cược giữa ván. Danh sách cược mới khác thì dừng native, xóa/thêm và Start lại; cùng tiền/target thì giữ Auto.

Giữ lịch sử, W/L, turnover, P/L toàn phiên và các bộ đếm của bảng còn tồn tại. Bảng mới khởi đầu bậc 1; bảng bị xóa vẫn giữ giao dịch đã tính trong tổng phiên. Khi xóa bậc đang chạy vượt số bậc mới, về bậc cuối còn lại với lượt 0. Nếu giảm số vòng xuống dưới số lượt đã dùng, chuyển theo quy tắc hết bậc. Đổi điều kiện vào chuỗi thì xét lại điều kiện. Sửa bảng đã hết bậc cho phép bảng xét điều kiện chạy lại. Vốn khởi tạo, đồng cược, ô số dư và giới hạn thao tác Auto vẫn cần phiên mới; vốn khởi tạo không đổi giữa phiên để không làm sai P/L. Stop loss/take profit có thể chỉnh trong chiến thuật và được kiểm tra lúc áp dụng.

60 kiểm thử tự động đã qua cùng kiểm tra giao diện build: mở editor khi Live và giữ mở qua cập nhật, nhân đôi/sửa/Lưu gửi update-config, tính ván cũ đúng mức, giữ Auto khi chỉ sửa bậc tương lai, xóa bảng không mất tổng P/L, từ chối cấu hình sai/vốn khởi tạo đổi, bản lưu cuối cùng áp dụng và giới hạn chỉ số khi xóa bậc. Các kiểm thử dùng môi trường mô phỏng, chưa kiểm chứng đặt cược tiền thật trên tài khoản Stake.


## v1.0.10 — target lớn có dấu phân cách hàng nghìn

Ảnh cho thấy lỗi “Stake thêm mức/target khác cấu hình” sau dòng thứ 7, ô target x3300; 9 bảng bật gồm x90/x250/x350/x440/x880/x120/x3300/x9300/x19300. Tái hiện cùng thông báo với row x3300 hiển thị 3.300,00×: parser cũ chỉ nhận một dấu thập phân nên trả NaN. Đây là lỗi bộ đọc trong trường hợp định dạng có phân cách hàng nghìn, không khẳng định cấu trúc DOM thực của tài khoản chỉ từ ảnh.

Parser mới hỗ trợ 3.300,00 / 3,300.00 và 4.000.000,00 / 4,000,000.00; giữ nguyên số thập phân nhỏ, từ chối phân nhóm sai. Áp dụng cho lịch sử và danh sách cược. Một dấu phân cách vẫn được coi là dấu thập phân để không đoán 1,001 thành 1001. Kiểm tra thêm cược theo toàn bộ tập dòng đã chuẩn bị thay vì giả định dòng mới luôn đứng cuối; sai mức thật vẫn chặn Start. Thông báo sai mức/target ghi giá trị yêu cầu và văn bản các dòng vừa đọc để chẩn đoán.

Test hồi quy 9 target nêu trên thất bại trước sửa, qua sau sửa; thêm test định dạng Anh, x4 triệu, dòng mới ở đầu danh sách, từ chối sai mức và phân nhóm sai. 64/64 test cùng kiểm tra giao diện build đã qua. Các thao tác cược dùng DOM mô phỏng, chưa kiểm chứng đặt cược tiền thật trên tài khoản Stake.

