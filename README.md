# 海洋風數獨 Ocean Sudoku

這是一個海洋風、手機可用的數獨網頁遊戲專案，使用 HTML、CSS、JavaScript 製作。

本版加入兩種分享玩法：

1. **分享同一題網址**：朋友打開後看到同一題，但進度各自獨立。
2. **多人即時房間**：需要設定 Firebase Realtime Database。建立房間後，朋友打開房間連結可以同步同一盤的填數字進度。

## 功能

- 自動產生完整合法數獨答案
- 挖空後檢查題目是否只有唯一解
- 四種難度：簡單、中等、困難、專家
- 手機版響應式介面
- 分享同一題網址：網址會帶有 seed 與 difficulty
- 多人即時房間：房間代碼、房間連結、玩家列表、同步填數字進度
- 海洋風簡約清爽 UI
- 筆記模式 / 候選數
- 提示功能
- 檢查目前盤面
- 錯誤、提示、時間統計
- 支援鍵盤操作

## 檔案結構

```text
index.html                主頁面
styles.css                介面樣式
app.js                    遊戲邏輯、數獨產生器、多人同步
firebase-config.js        Firebase 設定檔，需要貼上你的專案設定
firebase-rules-demo.json  Firebase Realtime Database 測試規則
README.md                 專案說明
```

## 單人使用方式

直接用瀏覽器打開 `index.html`，或部署到 GitHub Pages。

按下「分享同一題」後，遊戲會複製目前題目的連結，例如：

```text
index.html?seed=abc123&difficulty=medium
```

朋友打開這個連結會得到相同題目；這是「同題各自玩」，不會同步彼此進度。

## 多人房間使用方式

多人房間需要先完成 Firebase 設定：

1. 到 Firebase Console 建立專案。
2. 新增 Web App。
3. 建立 Realtime Database。
4. 到 Realtime Database 的 Rules 貼上 `firebase-rules-demo.json` 的內容。
5. 複製 Firebase SDK config。
6. 打開 `firebase-config.js`，把 placeholder 換成你的實際設定。
7. 上傳更新後的檔案到 GitHub repository。
8. 等 GitHub Pages 重新部署。
9. 打開網站，按「建立房間」。
10. 按「複製房間連結」給朋友。

注意：`firebase-rules-demo.json` 是方便測試的公開房間規則，適合原型測試，不適合有帳號、排行榜、個資或正式商用資料的版本。

## 快捷鍵

- `1`～`9`：輸入數字或切換筆記
- `Backspace` / `Delete` / `0`：清除目前格子
- `N`：切換筆記模式
- `H`：使用提示
- 方向鍵：移動選取格子

## 部署

這是靜態網站，可直接部署到 GitHub Pages、Netlify、Vercel 或任何靜態網站空間。


## 這一版更新

- 手機版把「筆記模式、清除、提示、檢查」和 1～9 數字鍵盤移到多人房間區塊上方，操作時不用一直往下滑。
- 多人房間會分開顯示每位玩家正確填入的格數，例如「海友AN7L（你）｜3 格」。
- 只有手動填對的格子會計入玩家解題數；使用提示填入的格子不列入個人解題數。
- 如果正確格子被清除或改錯，該格原本歸屬玩家的格數會扣回。

## 更新 GitHub Pages 時的提醒

如果你的 GitHub 上 `firebase-config.js` 已經填好 Firebase 設定，更新檔案時請保留它，或在上傳新版後再把 Firebase 設定貼回去。
