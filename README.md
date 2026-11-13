# 噁男殺手　SKY KILLER

在真實台北市衛星地圖上狙擊噁男的俯視狙擊遊戲。你是暗網上的頂尖駭客兼職業狙擊手，對一般仇殺沒興趣，只接被性騷擾、跟騷、偷拍的女性與女學生的委託。法律管不了的噁男，由你從幾百公尺外解決。

🎮 **線上試玩：** https://xiang0723.github.io/project_game_skykiller/

> 不用安裝、不用註冊，用電腦瀏覽器就能玩（手機也能開，但瞄準比較吃力）。進度存在你自己的瀏覽器裡。

> ⚠️ **內容提醒**：遊戲內含暴力情節，以及對性騷擾、性犯罪行為的直白描述，建議成年玩家遊玩。

---

## 遊戲特色

- **真實的台北市地圖**：Esri 衛星空照圖加上 OpenStreetMap 的真實路網，涵蓋台北市 12 個行政區。選好行政區後，每一局都會在區內隨機挑一塊市區當狙擊場，每次的街景都不一樣。
- **上帝視角狙擊**：從正上方俯瞰街道，拖曳地圖瞄準，縮放就是狙擊鏡倍率。×18 看得到上衣顏色，×19 看得到帽子，×21 以上看得到身體部位。
- **真實的彈道**：你從地圖上固定的狙擊位置開槍。距離越遠，子彈飛得越久，移動中的目標要抓提前量。橫風會把子彈吹偏，還有隨著距離變大的散布。準星有公尺刻度，可以自己修正。
- **暗網委託**：委託人會描述噁男的惡行，情節從輕微騷擾到極度噁心都有，並附上噁男的特徵（上衣、帽子、高矮胖瘦、年齡）與出沒的行政區。
- **指定部位與順序**：委託人會要求「一槍爆頭」，或是「先打胯下、再打兩隻手掌、最後爆頭」這類要求。全身 21 個部位都可能被指定，可以重複，甚至先打死再補槍（鞭屍）。全部照順序完成才拿全額酬勞。
- **找出噁男**：現場有上百個路人，還有穿得一樣的誘餌和撞衫的人。要靠身高、胖瘦、頭髮顏色（年齡）和走路速度分辨。槍聲會讓附近的人四散逃跑，誤傷路人會被扣酬勞和聲望。
- **經濟與裝備**：受害者付不起高價，酬勞不多。子彈要自己買，結餘拿去升級狙擊鏡、彈匣、高速槍管、彈道電腦、消音器和監視器入侵。

## 怎麼玩

1. 在 **暗網終端** 的「委託」頁挑一件委託，看清楚噁男的特徵、出沒地區和委託人的要求。
2. 進入狙擊場後，**藍圈** 是你的位置，**黃圈** 是噁男活動範圍，**紅框** 是地圖邊界。
3. 拖曳地圖找人，滾輪、雙指或 **E / Q** 縮放。先用上衣顏色篩選，再放大確認帽子、體型和年齡。
4. 準星永遠在畫面中央。注意準星下方的距離、飛行時間和風偏，按 **SPACE** 或右下角按鈕開火。
5. 打中非致命部位，噁男會倒地不動，就能從容完成委託人指定的順序。
6. 噁男死了而且要求都完成，就是完美達成；也可以按「收工撤離」提早結算。

暗網終端的「檔案」頁有完整的背景故事與操作說明。

## 技術

- 純前端：HTML + CSS + 原生 JavaScript，**不需要建置工具**。
- 地圖：[Leaflet](https://leafletjs.com/) + [Esri World Imagery](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) 衛星空照圖。
- 路網：[OpenStreetMap](https://www.openstreetmap.org/) 資料，事先用 Overpass API 下載各行政區的區界與道路，壓縮後放在 `data/`，遊戲執行時不需要連到 OpenStreetMap。
- 人物：程式產生的 SVG 俯視人形，外觀與命中判定使用同一份部位資料，看到的就是打得到的。
- 音效：Web Audio API 即時合成，沒有音效檔。
- 存檔：瀏覽器 `localStorage`。

## 在自己的電腦上執行

下載或 clone 專案後，在專案資料夾開一個本機伺服器（任何靜態伺服器都可以）：

```bash
python -m http.server 8765
```

然後用瀏覽器打開 http://localhost:8765/

## 更新街道資料

各行政區的路網存在 `data/<行政區>.js`。要重新下載（例如 OpenStreetMap 有更新）時，需要 Node.js 18 以上：

```bash
node tools/build-roads.mjs
```

只更新指定行政區：

```bash
node tools/build-roads.mjs xinyi daan
```

腳本會依序向 Overpass 公開伺服器查詢，每個行政區之間會暫停幾秒，避免造成伺服器負擔。

## 專案結構

```
index.html              遊戲本體（暗網終端、地圖、狙擊、彈道、委託、裝備、存檔）
data/
  xinyi.js …            台北市 12 個行政區的區界與路網（由腳本產生，請勿手動編輯）
tools/
  build-roads.mjs       下載並壓縮各行政區路網的腳本
images/
  favicon.svg           網站圖示
```

## 聲明

本遊戲為虛構作品，委託人、噁男與所有情節皆為隨機產生，與任何真實人物、事件無關。遊戲以誇張的復仇幻想為題材，不代表鼓勵任何現實中的暴力或私刑。如果你正遭受性騷擾或跟蹤騷擾，請撥打 **113 保護專線** 或 **110** 報警。

衛星空照圖 © Esri、Maxar、Earthstar Geographics。路網資料 © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors。

## 授權

Copyright © 2026 Jax Huang（GitHub：[xiang0723](https://github.com/xiang0723)）

本作品採用 [創用 CC 姓名標示-非商業性 4.0 國際（CC BY-NC 4.0）](https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hant) 授權。作者保有著作權，歡迎任何人重製、散布、修改，但必須遵守：

- **姓名標示**：保留原作者 Jax Huang 的姓名與本專案連結，並註明是否有修改。
- **非商業性**：不得用於商業目的。想要商業使用，請先聯絡作者：xiang666@gmail.com。

完整條款見 [LICENSE](LICENSE)。

第三方資源依各自的授權使用：[Leaflet](https://leafletjs.com/)（BSD 2-Clause）、[OpenStreetMap](https://www.openstreetmap.org/copyright) 資料（ODbL）、[Esri World Imagery](https://www.esri.com/en-us/legal/terms/full-master-agreement)（依 Esri 使用條款，僅即時顯示，不重新散布圖資）。

## 製作

xiang666@gmail.com
