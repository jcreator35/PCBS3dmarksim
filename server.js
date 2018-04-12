//Server creating stuff
let express = require("express");
let cors = require('cors');
let bodyParser = require('body-parser');
let app = express();
let path = require("path");
let fs = require("fs");
let port = process.env.PORT || 8080;
app.use(cors());
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

//Route for homepage
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

//Variables for database info
let CPUDB = require("./dataCPU");
let GPUDB = require("./dataGPU");
let MBDB = require("./dataMB");
let RAMDB = require("./dataRAM");
let GPU3DMark = require("./GPU3Dmark");
const ScoreDB = require("./ScoreDB");
let levels = [0, 1200, 3000, 4800, 6600, 8400, 10500, 13000, 16000, 19500, 23500, 28000, 33000, 38000, 43000, 48000, 53000, 58000, 63000, 68000, 73000];
let ramSpeeds = [2133, 2400, 2666, 2800, 3000, 3200, 3600, 3733, 4000];
let methods = ["calcScore", "upgradeCPU", "upgradeGPU", "upgradeOptimal"];

//Helper functions
function calcCPUScore(cpu, mb, ramFreq, ramNumb) {
    let minFreq = Math.min(parseFloat(ramFreq), parseFloat(mb["maxMemSpeed"]));
    let CPUTestScore = parseFloat(cpu["coefCoreClock"]) * parseFloat(cpu["freq"]) + parseFloat(cpu["coefMemChannel"]) * ramNumb + parseFloat(cpu["coefMemClock"]) * minFreq + parseFloat(cpu["adjustment"]);
    let CPUScore = Math.trunc(298.0 * CPUTestScore);
    return [CPUTestScore.toFixed(2), CPUScore.toFixed(2)]
}
function calcGPUScore(gpu, gpuNum, mb) {
    let GPUTestScore1 = 0;
    let GPUTestScore2 = 0;
    if( gpuNum===1 || gpu["doubleGPU"]==="False"){
        GPUTestScore1 = parseFloat(gpu["test1memcl"]) * parseFloat(gpu["memClock"]) + parseFloat(gpu["test1corecl"]) * parseFloat(gpu["coreClock"]) + parseFloat(gpu["test1adj"]);
        GPUTestScore2 = parseFloat(gpu["test2memcl"]) * parseFloat(gpu["memClock"]) + parseFloat(gpu["test2corecl"]) * parseFloat(gpu["coreClock"]) + parseFloat(gpu["test2adj"]);
    }else{
        if(gpu["useSLI"] === "True" && mb["supportSLI"] === "True" && gpu["doubleGPU"]==="True"){
            GPUTestScore1 = parseFloat(gpu["test1_2memcl"]) * parseFloat(gpu["memClock"]) + parseFloat(gpu["test1_2corecl"]) * parseFloat(gpu["coreClock"]) + parseFloat(gpu["test1_2adj"]);
            GPUTestScore2 = parseFloat(gpu["test2_2memcl"]) * parseFloat(gpu["memClock"]) + parseFloat(gpu["test2_2corecl"]) * parseFloat(gpu["coreClock"]) + parseFloat(gpu["test2_2adj"]);
        }
        else if (gpu["useSLI"] === "False" && mb["supportCrossfire"] === "True" && gpu["doubleGPU"]==="True"){
            GPUTestScore1 = parseFloat(gpu["test1_2memcl"]) * parseFloat(gpu["memClock"]) + parseFloat(gpu["test1_2corecl"]) * parseFloat(gpu["coreClock"]) + parseFloat(gpu["test1_2adj"]);
            GPUTestScore2 = parseFloat(gpu["test2_2memcl"]) * parseFloat(gpu["memClock"]) + parseFloat(gpu["test2_2corecl"]) * parseFloat(gpu["coreClock"]) + parseFloat(gpu["test2_2adj"]);
        }else{
            GPUTestScore1 = parseFloat(gpu["test1memcl"]) * parseFloat(gpu["memClock"]) + parseFloat(gpu["test1corecl"]) * parseFloat(gpu["coreClock"]) + parseFloat(gpu["test1adj"]);
            GPUTestScore2 = parseFloat(gpu["test2memcl"]) * parseFloat(gpu["memClock"]) + parseFloat(gpu["test2corecl"]) * parseFloat(gpu["coreClock"]) + parseFloat(gpu["test2adj"]);
        }
    }
    let GPUScore = Math.trunc(328.0 / (1.0 / GPUTestScore1 + 1.0 / GPUTestScore2));
    return [GPUTestScore1.toFixed(2), GPUTestScore2.toFixed(2), GPUScore.toFixed(2)];
}
function calcScore(cpu, gpu, mb, ramFreq, ramNumb, gpuNum) {
    let result = {};

    let GPUScores = calcGPUScore(gpu, gpuNum, mb);
    result["GPU Test1"] = GPUScores[0];
    result["GPU Test2"] = GPUScores[1];
    result["GPU Score"] = GPUScores[2];

    let CPUScores = calcCPUScore(cpu, mb, ramFreq, ramNumb);
    result["CPU Test"] = CPUScores[0];
    result["CPU Score"] = CPUScores[1];

    result["Total score"] = Math.trunc(1.0 / (0.85 / parseInt(GPUScores[2]) + 0.15 / parseInt(CPUScores[1])));
    return result;
}
function isInt(value) {
    // noinspection EqualityComparisonWithCoercionJS
    return !isNaN(value) &&
        parseInt(Number(value)) == value &&
        !isNaN(parseInt(value, 10));
}
function findMBbyName(mbName){
    return MBDB.find(x => x["name"] === mbName);
}

//DB access functions
app.get('/getCPUList', function (req, res) {
    let newList = [];
    CPUDB.forEach(function (item, i) {
        newList.push({"id":i+1, "Name": item["name"], "Frequency": item["freq"] +"HZ", "Socket": item["socket"], "Price": item["price"]+"$"});
    });
    res.json(newList);
});
app.get('/getGPUList', function (req, res) {
    let newList = [];
    GPUDB.forEach(function (item, i) {
        newList.push({"id":i+1, "Name": item["name"], "Core Clock": item["coreClock"] +"HZ", "Memory Clock": item["memClock"] +"HZ", "Price": item["price"]+"$"});
    });
    res.json(newList);
});
app.get('/getMBList', function (req, res) {
    let newList = [];
    MBDB.forEach(function (item, i) {
        newList.push({"id":i+1, "Name": item["name"], "Socket": item["socket"], "RAM Support": item["ramType"], "RAM Speed": item["maxMemSpeed"] +"HZ", "Price": item["price"]+"$"});
    });
    res.json(newList);
});
app.get('/getRAMList', function (req, res) {
    let newList = [];
    RAMDB.forEach(function (item, i) {
        newList.push({"id":i+1, "Name": item["name"], "RAM Type": item["ramType"], "Frequency": item["freq"] + "HZ", "Price": item["price"]+"$"});
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
    if(req.body["method"] === undefined || methods.indexOf(req.body["method"]) === -1){
        error = true;
        res.status(200).json({"Error":" Wrong method"});
    }
    else if(req.body["cpu"] === undefined || !isInt(req.body["cpu"]) || parseInt(req.body["cpu"])<1 || CPUDB.length < parseInt(req.body["cpu"])){
        error = true;
        res.status(200).json({"Error":" Wrong CPU ID"});
    }
    else if(req.body["gpu"] === undefined || !isInt(req.body["gpu"]) || parseInt(req.body["gpu"])<1 || GPUDB.length < parseInt(req.body["gpu"])){
        error = true;
        res.status(200).json({"Error":" Wrong GPU ID"});
    }
    else if(req.body["mb"] === undefined || !isInt(req.body["mb"]) || parseInt(req.body["mb"])<1 || MBDB.length < parseInt(req.body["mb"])){
        error = true;
        res.status(200).json({"Error":" Wrong Motherboard ID"});
    }
    else if(req.body["ram"] === undefined || !isInt(req.body["ram"]) || parseInt(req.body["ram"])<1 || RAMDB.length < parseInt(req.body["ram"])){
        error = true;
        res.status(200).json({"Error":" Wrong RAM ID"});
    }
    else if(req.body["ramSticks"] === undefined || !isInt(req.body["ramSticks"]) || parseInt(req.body["ramSticks"])<1 || parseInt(req.body["ramSticks"])>8){
        error = true;
        res.status(200).json({"Error":" Wrong amount of ram sticks"});
    }
    else if(req.body["gpuCount"] === undefined || !isInt(req.body["gpuCount"]) || parseInt(req.body["gpuCount"])<1 || parseInt(req.body["gpuCount"])>2){
        error = true;
        res.status(200).json({"Error":" Wrong amount of gpu's"});
    }
    else if(req.body["method"] !== "calcScore" && (req.body["targetScore"] === undefined || !isInt(req.body["targetScore"]) || parseInt(req.body["targetScore"])<0)){
        error = true;
        res.status(200).json({"Error":" Wrong target score"});
    }
    if(!error){
        let cpu = CPUDB[parseInt(req.body.cpu)-1];
        let mb = MBDB[parseInt(req.body.mb)-1];
        if (cpu.socket !== mb.socket) {
            res.status(200).json({"Error":" You selected CPU and MB with different sockets"});
        }else{
            let method = req.body.method;
            let gpu = GPUDB[parseInt(req.body.gpu)-1];
            let ram = RAMDB[parseInt(req.body.ram)-1];
            let gpuCount = parseInt(req.body["gpuCount"]);
            let sticks = parseInt(req.body.ramSticks);
			if (mb.name.indexOf("X399")===-1 && sticks>4) sticks = 4;   //Removing spare ram sticks
            if(method === "calcScore"){
                let score = calcScore(cpu, gpu, mb, ram["freq"], sticks, gpuCount);
                res.json(score);
            }
            else {
                let targetScore = parseInt(req.body.targetScore);
                let beginScore = calcScore(cpu, gpu, mb, ram["freq"], sticks, gpuCount)["Total score"];

                if(beginScore >= targetScore){
                    res.status(200).json({"Error":"Your PC already have needed score"});
                }else{
                    let build = undefined;
                    let errorText = "Method not found";
                    if(method==="upgradeCPU"){
                        build = ScoreDB.find(x => findMBbyName(x["MB"])["socket"] === mb["socket"] && x["GPU"] === gpu["name"] && x["GPU Quantity"] === gpuCount && x["Score"] >= targetScore);
                        errorText = " Can't meet required score by upgrading only CPU.";
                    }
                    if(method==="upgradeGPU"){
                        build = ScoreDB.find(x => findMBbyName(x["MB"])["socket"] === mb["socket"] && x["CPU"] === cpu["name"] && x["Usefull RAM Freq"] === ram["freq"] && x["RAM Sticks"] === sticks && x["Score"] >= targetScore);
                        errorText = " Can't meet required score by upgrading only GPU";
                    }
                    if(method === "upgradeOptimal") {
                        build = ScoreDB.find(x => x["Score"] >= targetScore);
                        errorText = " Can't score that high";
                    }
                    if (build!==undefined){
                        build = JSON.parse(JSON.stringify(build));
                        let currBuidPrice = parseInt(cpu["price"]) + parseInt(gpu["price"])*gpuCount + parseInt(mb["price"]) + parseInt(ram["price"])*sticks;
                        let cheapestRAM = RAMDB.find(x => x["freq"] === build["Usefull RAM Freq"].toString());
                        let currBuild = {
                            "CPU": cpu["name"],
                            "GPU": gpu["name"],
                            "GPU Quantity": gpuCount,
                            "MB": mb["name"],
                            "RAM": ram["name"],
                            "RAM Sticks": sticks,
                            "Score": calcScore(cpu, gpu, mb, ram["freq"], sticks, gpuCount)["Total score"],
                            "Price": currBuidPrice
                        };

                        build["RAM"] = cheapestRAM["name"];
                        build["RAM Freq"] = undefined;
                        build["Usefull RAM Freq"] = undefined;
                        let obj = {"Starting Build": currBuild, "Result Build": build, "Price difference": build["Price"] - currBuidPrice};
                        res.json(obj);
                    }else res.status(200).json({"Error": errorText});
                }
            }

        }
    }
});

app.listen(port);
console.log('Server started on port ' + port);