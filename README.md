# readsb ver-Ka

Special thanks to everyone involved in the development of this product.

This is a fork of [Mictronics Readsb](https://github.com/Mictronics/readsb).

=======

This is a modification of the dev branch of Mictronics version readsb for my own use.
*Work test/markers_test
![markers_test](https://github.com/kamadas/dump1090/blob/images/test.png)

* Display the flight number next to the icon.
![Flight_Number](https://github.com/kamadas/dump1090/blob/images/FlightNo3.png)

* Display Rnav routes and VOR-ways on the map. (Only Sapporo Control Zone has been filled in)
![All_Rnav_and_VOR-way](https://github.com/kamadas/dump1090/blob/images/All_Rnav_and_Low-way.png)

* Display airport arrival routes and departure routes. (Data has been input only in Hokkaido)
![Arrival](https://github.com/kamadas/dump1090/blob/images/images/Arr.png)
![Deperture](https://github.com/kamadas/dump1090/blob/images/Dep.png)

* The display items are limited for Raspberry Pi official 7 inch LCD.
![LCD](https://github.com/kamadas/dump1090/blob/images/LCD_infoscreen.png)
![LCD2](https://github.com/kamadas/dump1090/blob/images/sidebar.png)
![LCD3](https://github.com/kamadas/dump1090/blob/images/sidebar-full.png)

* Improved the icon to turn north when no signal condition continues.
![Track](https://github.com/kamadas/dump1090/blob/images/NOT_track_to_North.png)

* Added the function to search and display the call sign of MLAT flight.
![MLAT](https://github.com/kamadas/dump1090/blob/images/alfa-wing.png)

* Implemented the operator display function of MLAT flight.
![Operator1](https://github.com/kamadas/dump1090/blob/images/operator1.png)
![Operator2](https://github.com/kamadas/dump1090/blob/images/operator2.png)

* Display to Operator with IATA codes such as JL, IJ, and FW.
![Operator3](https://github.com/kamadas/dump1090/blob/images/fw.png)

* Changed display of FlightNo. by ZoomLevel.

* Add Sapporo Area Control Center's S01 to S05 to the map.
![Sapporo ACC](https://github.com/kamadas/dump1090/blob/images/Acc.png)

## TODO

* Since location information overlaps with data such as rnav, I want to unify it.
 However, because I am not used to handling indexed DB, I am trying and trying in implementation method.

* I want to update the site position based on the gps information at the time of mobile operation.
