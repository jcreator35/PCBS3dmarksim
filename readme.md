# PC Building Simulator 3Dmark Calculator
This tool is created for Steam Game [PC Building Simulator](https://store.steampowered.com/app/621060/PC_Building_Simulator/).
Many of players including me experienced problem how to complete 3D Mark Jobs easily and efficiently.
After gathering info on Steam Discussions I decided to create my own solution to the problem and here it is.

Online version can be found here: https://pcbs.herokuapp.com

## Features

* Calculating score of selected build without need to do it in-game
* Multiple strategies to achieve needed 3D mark score
* Results are calculated same way as game does, so you will always get correct results

## Installation guide for local usage

* Download all source code from this repository to your computer
* Unpack all files from zip archive
* Install **Node.js v9.11.1** from [here](https://nodejs.org/en/) or check if you have it by typing in console "node -v". Supported version is **9 and higher**
* After installing/updating, open folder with downloaded files.
* **Shift + right click** in folder, and in context menu select **Open PowerShell (or cmd) window here**.
* If you starting it for the first time type **npm install**, it will install all needed packages. You don't need to do it next time when you start the tool
* After that in same window type **node server.js**, it should print line **Server started on port 8080**.
* If everything is ok, navigate to **localhost:8080** in your browser. Now you have completely offline version of this tool, to use anywhere you want.
* If you have any errors, check if Node install corectly by typing **node -v** in same window.
* If your problem is more complicated, feel free to write me here or in Steam Discussions. I will try to help you

## Enjoy