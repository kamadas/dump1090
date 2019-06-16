# dump1090 Kamadas

Special thanks to everyone involved in the development of this product.

This is a fork of [Mictronics dump1090](https://github.com/Mictronics/dump1090).

## Modifications:

Mictronics版dump1090のdevブランチを自分用に改変したものです。
This is a modification of the dev branch of Mictronics version dump1090 for my own use.

* フライトナンバーをアイコンの横に表示します。（FR24のiOSバージョンをイメージしています）
 Display the flight number next to the icon. (Imagining the iOS version of FR24)
![Flight Number](https://github.com/kamadas/dump1090/blob/images/images/FlightNo3.png)
* rnavルートやLow-wayをマップ上に表示できます。（札幌管制区のみデータ入力済み）
 Display Rnav routes and low-ways on the map. (Only Sapporo Control Zone has been filled in)
![All_Rnav_and_Low-way](https://github.com/kamadas/dump1090/blob/images/images/All_Rnav_and_Low-way.png)
* 空港到着ルート、出発ルートを表示できます。（北海道内のみデータ入力済み）
 Display airport arrival routes and departure routes. (Data has been input only in Hokkaido)
![Arrival](https://github.com/kamadas/dump1090/blob/images/images/Arrival.png)
![Deperture](https://github.com/kamadas/dump1090/blob/images/images/Deperture.png)
* ラズベリーパイ公式７インチLCD用に表示項目を制限しています。
 The display items are limited for Raspberry Pi official 7 inch LCD.
![LCD](https://github.com/kamadas/dump1090/blob/images/images/LCD_infoscreen.png)
* 無信号状態が続くとアイコンが北を向くのを改善しました。
 Improved the icon to turn north when no signal condition continues.
![Track](https://github.com/kamadas/dump1090/blob/images/images/NOT_track_to_North.png)
* データベースが重いので、軽量化しました。（特に北海道上空を通過する航空機データに特化しています）
 Improved the icon to turn north when no signal condition continues.
* MLAT機のコールサインを検索・表示する機能を追加しました。
 Added the function to search and display the call sign of MLAT flight.
![MLAT](https://github.com/kamadas/dump1090/blob/images/images/alfa-wing.png)
* MLAT機のオペレータ表示機能を実装しました。
 Implemented the operator display function of MLAT flight.
![Operator1](https://github.com/kamadas/dump1090/blob/images/images/operator1.png)
![Operator2](https://github.com/kamadas/dump1090/blob/images/images/operator2.png)
* オペレータ表示機能を JL,IJ,FW などのIATAコードに一部対応するように変更しました。
 Display to Operator with IATA codes such as JL, IJ, and FW.
![Operator3](https://github.com/kamadas/dump1090/blob/images/images/fw.png)
*フライトナンバー表示をズームレベルでOn/Offするように変更しました。
 Changed display of FlightNo. by ZoomLevel.

## TODO

* rnav等のデータに位置情報が重複しているので、一元化したい。が、indexedDBの扱いに慣れていないため、実装方法で試行錯誤中。
 Since location information overlaps with data such as rnav, I want to unify it.
 However, because I am not used to handling indexed DB, I am trying and trying in implementation method.

* 移動運用時に、gps情報をもとにsite位置を更新したい。
 I want to update the site position based on the gps information at the time of mobile operation.

