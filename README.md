# dump1090 Kamadas

This is a fork of [dump1090-fa](https://github.com/Mictronics/dump1090).

## Modifications:

Mictronics版dump1090の開発バージョンを自分用に改変したものです。

* フライトナンバーをアイコンの横に表示します。（FL２４のiOSバージョンをイメージしています）
![Flight Number](https://github.com/kamadas/dump1090/blob/images/images/FlightNo.png)
* rnavルートやLow-wayをマップ上に表示できます。（札幌管制区のみデータ入力済み）
![All_Rnav_and_Low-way](https://github.com/kamadas/dump1090/blob/images/images/All_Rnav_and_Low-way.png)
* 空港到着ルート、出発ルートを表示できます。（北海道内のみデータ入力済み）
![Arrival](https://github.com/kamadas/dump1090/blob/images/images/Arrival.png)
![Deperture](https://github.com/kamadas/dump1090/blob/images/images/Deperture.png)
* ラズベリーパイ公式７インチLCD用に表示項目を制限しています。
![LCD](https://github.com/kamadas/dump1090/blob/images/images/LCD_infoscreen.png)
* 無信号状態が続くとアイコンが北を向くのを改善しました。
![Track](https://github.com/kamadas/dump1090/blob/images/images/NOT_track_to_North.png)
* データベースが重いので、軽量化しました。（特に北海道上空を通過する航空機データに特化しています）
* MLAT機のコールサインを検索・表示する機能を追加しました。
![MLAT](https://github.com/kamadas/dump1090/blob/images/images/alfa-wing.png)
* MLAT機のオペレータ表示機能を実装しました。
![Private](https://github.com/kamadas/dump1090/blob/images/images/Operator\(Private\).png)

## TODO

* rnav等のデータに位置情報が重複しているので、一元化したい。が、indexedDBの扱いに慣れていないため、実装方法で試行錯誤中。

