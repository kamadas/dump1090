# dump1090 Kamadas

Special thanks to everyone involved in the development of this product.

This is a fork of [Mictronics dump1090](https://github.com/Mictronics/dump1090).

=======

This is a modification of the dev branch of Mictronics version dump1090 for my own use.

* Display the flight number next to the icon (Imagining the iOS version of FR24).
![Flight Number](https://github.com/kamadas/dump1090/blob/images/images/FlightNo3.png)
* Display Rnav routes and low-ways on the map. (Only Sapporo Control Zone has been filled in)
![All_Rnav_and_Low-way](https://github.com/kamadas/dump1090/blob/images/images/All_Rnav_and_Low-way.png)
* Display airport arrival routes and departure routes. (Data has been input only in Hokkaido)
![Arrival](https://github.com/kamadas/dump1090/blob/images/images/Arrival.png)
![Deperture](https://github.com/kamadas/dump1090/blob/images/images/Deperture.png)
* The display items are limited for Raspberry Pi official 7 inch LCD.
![LCD](https://github.com/kamadas/dump1090/blob/images/images/LCD_infoscreen.png)
* Improved the icon to turn north when no signal condition continues.
![Track](https://github.com/kamadas/dump1090/blob/images/images/NOT_track_to_North.png)
* Improved the icon to turn north when no signal condition continues.
* Added the function to search and display the call sign of MLAT flight.
![MLAT](https://github.com/kamadas/dump1090/blob/images/images/alfa-wing.png)
* Implemented the operator display function of MLAT flight.
![Operator1](https://github.com/kamadas/dump1090/blob/images/images/operator1.png)
![Operator2](https://github.com/kamadas/dump1090/blob/images/images/operator2.png)
* Display to Operator with IATA codes such as JL, IJ, and FW.
![Operator3](https://github.com/kamadas/dump1090/blob/images/images/fw.png)
* Changed display of FlightNo. by ZoomLevel.

## TODO

* Since location information overlaps with data such as rnav, I want to unify it.
 However, because I am not used to handling indexed DB, I am trying and trying in implementation method.

* I want to update the site position based on the gps information at the time of mobile operation.
