//Server creating stuff
let express = require("express");
let cors = require('cors');
let bodyParser = require('body-parser');
let app = express();
let path = require("path");
//let fs = require("fs");
let port = process.env.PORT || 8080;
app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//Variables for database info
let db = require("./data.json");
const ScoreDB = require("./ScoreDB");
//let levels = [0, 1200, 3000, 4800, 6600, 8400, 10500, 13000, 16000, 19500, 23500, 28000, 33000, 38000, 43000, 48000, 53000, 58000, 63000, 68000, 73000];
let ramSpeeds = [2133, 2400, 2666, 2800, 3000, 3200, 3600, 3733, 4000];
let methods = ["calcScore", "upgradeCPU", "upgradeGPU", "upgradeOptimal"];

//Helper functions
function calcScore(cpu, gpu, mb, ramFreq, ramNumb) {
    let result = {};
    //Calculating all for GPU score
    let GPUTestScore1 = parseFloat(gpu.test1memcl) * parseFloat(gpu.memClock) + parseFloat(gpu.test1corecl) * parseFloat(gpu.coreClock) + parseFloat(gpu.test1adj);
    let GPUTestScore2 = parseFloat(gpu.test2memcl) * parseFloat(gpu.memClock) + parseFloat(gpu.test2corecl) * parseFloat(gpu.coreClock) + parseFloat(gpu.test2adj);
    let GPUScore = Math.trunc(328.0 / (1.0 / GPUTestScore1 + 1.0 / GPUTestScore2));
    result["GPU Test1"] = GPUTestScore1.toFixed(2);
    result["GPU Test2"] = GPUTestScore2.toFixed(2);
    result["GPU Score"] = GPUScore.toFixed(2);

    //Calculating all for CPU score
    let minFreq = Math.min(parseFloat(ramFreq), parseFloat(mb.maxMemSpeed));
    let CPUTestScore = parseFloat(cpu.coefCoreClock) * parseFloat(cpu.freq) + parseFloat(cpu.coefMemChannel) * ramNumb + parseFloat(cpu.coefMemClock) * minFreq + parseFloat(cpu.adjustment);
    let CPUScore = Math.trunc(298.0 * CPUTestScore);
    result["CPU Test"] = CPUTestScore.toFixed(2);
    result["CPU Score"] = CPUScore.toFixed(2);

    result["Total score"] = Math.trunc(1.0 / (0.85 / GPUScore + 0.15 / CPUScore));
    return result;
}
function isInt(value) {
    return !isNaN(value) &&
        parseInt(Number(value)) == value &&
        !isNaN(parseInt(value, 10));
}
// function calcProgression(level, percent) {
//     if(level < levels.length && level > 0){
//         let baseLevel = levels[level-1];
//         let additional  = percent*(levels[level] - baseLevel)/100;
//         return baseLevel + additional;
//     }else {
//         return 0;
//     }
// }

//DB access functions
app.get('/getCPUList', function (req, res) {
    let newList = [];
    db.CPU.forEach(function (item, i) {
        newList.push({"id":i+1, "Name": item.FullName, "Frequency": item.freq +"HZ", "Socket": item.socket, "Price": item.price+"$"});
    });
    res.json(newList);
});
app.get('/getGPUList', function (req, res) {
    let newList = [];
    db.GPU.forEach(function (item, i) {
        newList.push({"id":i+1, "Name": item.FullName, "Core Clock": item.coreClock +"HZ", "Memory Clock": item.memClock +"HZ", "Price": item.price+"$"});
    });
    res.json(newList);
});
app.get('/getMBList', function (req, res) {
    let newList = [];
    db.MotherBoard.forEach(function (item, i) {
        newList.push({"id":i+1, "Name": item.FullName, "Socket": item.socket, "RAM Support": item.ramType, "RAM Speed": item.maxMemSpeed +"HZ", "Price": item.price+"$"});
    });
    res.json(newList);
});
app.get('/getRAMList', function (req, res) {
    let newList = [];
    db.RAM.forEach(function (item, i) {
        newList.push({"id":i+1, "Name": item.FullName, "RAM Type": item.ramType, "Frequency": item.freq + "HZ", "Price": item.price+"$"});
    });
    res.json(newList);
});
app.get('/ramSpeeds', function (req, res) {
    res.json(ramSpeeds);
});

//Calculation tools
app.post('/calcTools', function (req, res) {
    let error = false;

    //Validating Data
    if(req.body.method === undefined || methods.indexOf(req.body.method) === -1){
        error = true;
        res.status(200).json({"errorMsg":"Wrong method"});
    }
    else if(req.body.cpu === undefined || !isInt(req.body.cpu) || parseInt(req.body.cpu)<1 || db.CPU.length < parseInt(req.body.cpu)){
        error = true;
        res.status(200).json({"errorMsg":"Wrong CPU ID"});
    }
    else if(req.body.gpu === undefined || !isInt(req.body.gpu) || parseInt(req.body.gpu)<1 || db.GPU.length < parseInt(req.body.gpu)){
        error = true;
        res.status(200).json({"errorMsg":"Wrong GPU ID"});
    }
    else if(req.body.mb === undefined || !isInt(req.body.mb) || parseInt(req.body.mb)<1 || db.MotherBoard.length < parseInt(req.body.mb)){
        error = true;
        res.status(200).json({"errorMsg":"Wrong Motherboard ID"});
    }
    else if(req.body.ram === undefined || !isInt(req.body.ram) || parseInt(req.body.ram)<1 || db.RAM.length < parseInt(req.body.ram)){
        error = true;
        res.status(200).json({"errorMsg":"Wrong RAM ID"});
    }
    else if(req.body.ramSticks === undefined || !isInt(req.body.ramSticks) || parseInt(req.body.ramSticks)>4){
        error = true;
        res.status(200).json({"errorMsg":"Wrong amount of ram sticks"});
    }
    else if(req.body.method !== "calcScore" && (req.body.targetScore === undefined || !isInt(req.body.targetScore) || parseInt(req.body.targetScore)<0)){
        error = true;
        res.status(200).json({"errorMsg":"Wrong target score"});
    }
    if(!error){
        let cpu = db.CPU[parseInt(req.body.cpu)-1];
        let mb = db.MotherBoard[parseInt(req.body.mb)-1];
        if (cpu.socket !== mb.socket) {
            res.status(200).json({"errorMsg":"You selected CPU and MB with different sockets"});
        }else{
            let method = req.body.method;
            let gpu = db.GPU[parseInt(req.body.gpu)-1];
            let ram = db.RAM[parseInt(req.body.ram)-1];
            let sticks = parseInt(req.body.ramSticks);
            if(method === "calcScore"){
                let score = calcScore(cpu, gpu, mb, ram.freq, sticks);
                res.json(score);
            }
            else if(method === "upgradeCPU"){
                let priceToUpgrade = undefined;
                let startingPoint = 0;
                let targetScore = parseInt(req.body.targetScore);
                let beginScore = calcScore(db.CPU[startingPoint], gpu, mb, ram.freq, sticks)["Total score"];

                if(beginScore >= targetScore){
                    res.status(200).json({"errorMsg":"Your PC already have needed score"});
                }else{
                    startingPoint++;
                    while( beginScore<targetScore && startingPoint<db.CPU.length) {
                        if (db.CPU[startingPoint].socket === mb.socket)
                            beginScore = calcScore(db.CPU[startingPoint], gpu, mb, ram.freq, sticks)["Total score"];
                        if (beginScore < targetScore) startingPoint++;
                    }
                    if (startingPoint < db.CPU.length){
                        priceToUpgrade = db.CPU[startingPoint].price - cpu.price;
                        res.json({"CPU":db.CPU[startingPoint].FullName, "upgradePrice": priceToUpgrade, "Score": beginScore});
                    }else res.status(200).json({"errorMsg":"Can't meet required score by upgrading only CPU. Try adding more RAM sticks", "Max Score": beginScore});
                }
            }
            else if(method === "upgradeGPU"){
                let priceToUpgrade = undefined;
                let startingPoint = 0;
                let targetScore = parseInt(req.body.targetScore);
                let beginScore = calcScore(cpu, db.GPU[startingPoint], mb, ram.freq, sticks)["Total score"];
                if(beginScore >= targetScore){
                    res.status(200).json({"errorMsg":"Your PC already have needed score"});
                }else{
                    startingPoint++;
                    while( beginScore < targetScore && startingPoint<db.GPU.length) {
                        beginScore = calcScore(cpu, db.GPU[startingPoint], mb, ram.freq, sticks)["Total score"];
                        if (beginScore < targetScore) startingPoint++;
                    }
                    if (startingPoint < db.GPU.length){
                        priceToUpgrade = db.GPU[startingPoint].price - gpu.price;
                        res.json({"GPU":db.GPU[startingPoint].FullName, "upgradePrice": priceToUpgrade, "Score": beginScore});
                    }else res.status(200).json({"errorMsg":"Can't meet required score by upgrading only GPU", "Max Score": beginScore});
                }
            }
            else if(method === "upgradeOptimal"){
                let targetScore = parseInt(req.body.targetScore);
				let findBuild = ScoreDB.find(x => x.Score >= targetScore);
				if (findBuild !== undefined){
					let cheapestBuild = JSON.parse(JSON.stringify(findBuild));
					let cheapestRAM = db.RAM.find(x => x.freq === cheapestBuild["Usefull RAM Freq"].toString());
					let currBuidPrice = parseInt(cpu.price) + parseInt(gpu.price) + parseInt(mb.price) + parseInt(ram.price)*sticks;
					let currBuild = {
						"CPU": cpu.FullName,
						"MB": mb.FullName,
						"RAM": ram.FullName,
						"RAM Sticks": sticks,
						"Score": calcScore(cpu, gpu, mb, ram.freq, sticks)["Total score"],
						"Price": currBuidPrice,
						"GPU": gpu.FullName
					};
					cheapestBuild["RAM"] = cheapestRAM.FullName;
					cheapestBuild["RAM Freq"] = undefined;
					cheapestBuild["Usefull RAM Freq"] = undefined;
					let obj = {"Starting Build": currBuild, "Result Build": cheapestBuild, "Price difference": cheapestBuild.Price - currBuidPrice};
					res.json(obj);
				}else res.status(200).json({"errorMsg":"Can't score that high"});
            }
        }
    }
});
// app.post('/calcProgression', function (req, res) {
//     let level = parseInt(req.body.level);
//     let percent = parseInt(req.body.percent);
//     res.json({"result": calcProgression(level, percent)});
// });

// function preCalc3DMarkScore(){
//     // let GPUScores = [];
//     //     // db.GPU.forEach(function (gpu, i) {
//     //     //     let GPUTestScore1 = parseFloat(gpu.test1memcl) * parseFloat(gpu.memClock) + parseFloat(gpu.test1corecl) * parseFloat(gpu.coreClock) + parseFloat(gpu.test1adj);
//     //     //     let GPUTestScore2 = parseFloat(gpu.test2memcl) * parseFloat(gpu.memClock) + parseFloat(gpu.test2corecl) * parseFloat(gpu.coreClock) + parseFloat(gpu.test2adj);
//     //     //     let GPUScore = Math.trunc(328.0 / (1.0 / GPUTestScore1 + 1.0 / GPUTestScore2));
//     //     //     GPUScores[i] = {"Name": gpu.FullName, "Score": GPUScore, "Price": parseInt(gpu.price)};
//     //     // });
//     //     // fs.writeFile('./dataTest.json', JSON.stringify(GPUScores, null, 2));
//     let combinations = [];
//     ramSpeeds.forEach(function (el) {
//         let totalPrice = 0;
//         let cheapestRam = db.RAM.find(x => x.freq === el.toString());
//         for(let sticks = 1; sticks<=4; sticks++) {
//             db.CPU.forEach(function (cpu) {
//                 totalPrice = parseInt(cheapestRam.price) * sticks;
//                 totalPrice += parseInt(cpu.price);
//                 let cheapestMobo = db.MotherBoard.find(x => x.socket === cpu.socket);
//                 totalPrice += parseInt(cheapestMobo.price);
//                 let minFreq = Math.min(parseFloat(cheapestRam.freq), parseFloat(cheapestMobo.maxMemSpeed));
//                 let CPUTestScore = parseFloat(cpu.coefCoreClock) * parseFloat(cpu.freq) + parseFloat(cpu.coefMemChannel) * sticks + parseFloat(cpu.coefMemClock) * minFreq + parseFloat(cpu.adjustment);
//                 let CPUScore = Math.trunc(298.0 * CPUTestScore);
//                 combinations.push({
//                     "CPU": cpu.FullName,
//                     "MB": cheapestMobo.FullName,
//                     "RAM Freq": parseInt(cheapestRam.freq),
//                     "Usefull RAM Freq": parseInt(minFreq),
//                     "RAM Sticks": sticks,
//                     "Score": CPUScore,
//                     "Price": totalPrice
//                 });
//             });
//         }
//     });
//     combinations.sort(function (a,b) {
//         return a["Price"] - b["Price"];
//     });
//     console.log(combinations.length);
//     fs.writeFile('./dataTestCPU.json', JSON.stringify(combinations, null, 2));
// }
//
// function createScoresDB(){
//     let resultDB = [];
//     GPUDB.forEach(function (gpu) {
//         CPUDB.forEach(function (cpu) {
//             let obj = JSON.parse(JSON.stringify(cpu));
//             obj.Price += gpu.Price;
//             obj["GPU"] = gpu.Name;
//             obj.Score = Math.trunc(1.0 / (0.85 / cpu.Score + 0.15 / gpu.Score));
//             resultDB.push(obj);
//         });
//     });
//     resultDB.sort(function (a,b) {
//         return a["Price"] - b["Price"];
//     });
//     console.log(resultDB.length);
//     fs.writeFile('./ScoreDB.json', JSON.stringify(resultDB, null, 2));
// }
// //createScoresDB();

app.listen(port);
console.log('Server started on port ' + port);