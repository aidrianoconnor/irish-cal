# irish-cal
a simple web-based visualizer of where the current day falls in solar, lunar and Irish "Fire Festival" cycles

at the current time all data is manually copy / pasted (with minor edits) into data.js from the very useful astronomical data API provided by the US Navy at https://aa.usno.navy.mil/data/api

the focus of the project was to create a calendar UI that would present the current time of year in an experience that might be lightly akin to neolithic / bronze age Irish people who tracked time via "standing stone" circles, ie in a less linear, more cyclical fashion without the specific month / day names of our modern Julian calendar.  by observing the positions and phases of the moon, one might understand the current day as something along the lines of "just past Samhain" or "approaching the second new moon after Bealtaine" as opposed to, say, "July 13."

additional information on the moon, solar cycles and Fire Festivals in Irish pagan belief can be accessed by clicking the various labels in the UI, the content of which is stored in a very rudimentary CMS (read: javscript array of objects) in cms.js.  most, if not all, links are to materials from the Irish Pagan School (https://irishpagan.school), or teachers affiliated with them (The Crafty Cailleach / Amy O'Riordan, Brigid's Forge / Orlagh Costellow)