const mapObject = _.mapObject;
const extend = _.extend;
const omit = _.omit;
const findKey = _.findKey;
const values = _.values;
const isEmpty = _.isEmpty;
var procesos = [];
var processlist = [];
var processQuewe = [];
var mmu;
var mmu2;
var dmmu;
var ssmmu;

class Process {
  /**
   * RETORNA UN OBJETO PROCESO
   * @date 2021-04-18
   * @param {any} id  id del proceso
   * @param {any} at  tiempo de llegada
   * @param {any} xt  tiempo de ejecucion
   * @param {any} mSize tamaño en memeoria
   * @returns {Process}
   */
  constructor(id, at, xt, mSize) {
    this.id = id;
    this.at = at;
    this.xt = xt;
    this.mSize = mSize;
    this.color = getRandomColor();
  }
}

class Mmu {
  /**
   * Retorna un objeto de unidad de mandjo de memoria
   * @date 2021-04-18
   * @param {any} mode  modo de manejo de memoria
   * PFFV = particion fija con valor fijo
   * PFVV = particion fija con valor variable
   * @param {any} numberOfPartitions
   * @param {any} pffvPsize
   * @returns {any}
   */
  constructor(mode, numberOfPartitions,pffvPsize,quewe=[],segmentsize=0) {
    this.mmframecounter = 0;
    this.smframecounter = 0;
    this.quewe = quewe;
    this.mainMemory = {};
    this.virtualMemory = {};
    this.mode = mode;
    this.numberOfPartitions = numberOfPartitions;
    switch (mode) {
      case "PFFV":
        this.partitionFixedWithFixedValue(pffvPsize, numberOfPartitions);
        break;
      case "PFVV":
        this.partitionFixedWithVariableValue(16, 256, numberOfPartitions);
        break;
      case "PD":
        this.partitiondinamic(this.quewe);
      break;
      case "SS":
        this.simpleSegmentation(this.quewe,segmentsize);
    }
  }

  simpleSegmentation(quewe,segmentsize){
    quewe.forEach(process => {
      for (let index = 0; index < Math.round(process.mSize/segmentsize); index++) {
        this.addNewMainFrame(new MemoryFrame(segmentsize,`${process.id}-${index}`));        
      }
    });
  }

  partitiondinamic(quewe){
    quewe.forEach(process => {
      this.addNewMainFrame(new MemoryFrame(process.mSize));
    });
  }

  /**
   * agrega una nuevo frame separador a la memoria principal
   * @date 2021-04-18
   * @param {any} Frame un onbjeto frame
   * @returns {void}
   */
  addNewMainFrame(Frame) {
    this.mainMemory = extend(this.mainMemory, {[`F${this.mmframecounter}`]: Frame, });
    this.mmframecounter++;
  }

  /**
   * crea un sistema de particiones  fijas con tamaño fijo sobre la memoria principal
   * @date 2021-04-18
   * @param {any} partitionSize     el tmaño de la participacion
   * @param {any} numberOfPartitions  el nuemro de particiones
   * @returns {any}
   */
  partitionFixedWithFixedValue(partitionSize, numberOfPartitions) {
    for (let index = 0; index < numberOfPartitions; index++) {
      this.addNewMainFrame(new MemoryFrame(partitionSize));
    }
  }

  /**
   * crea un sistema de particiones  fijas con tamaño variable sobre la memoria principal
   * @date 2021-04-18
   * @param {any} partitionMultiplier el numero el cual el tamaño de las particiones son mutiplo
   * @param {any} maxPartitionSize  el tamaño maximo de las particiones
   * @param {any} numberOfPartitions el numero de pariciones a dividir la memoria
   * @returns {any}
   */
  partitionFixedWithVariableValue(
    partitionMultiplier,
    maxPartitionSize,
    numberOfPartitions
  ) {
    for (let i = 1; i <= numberOfPartitions; i++) {
      if (partitionMultiplier * i <= maxPartitionSize) {
        this.addNewMainFrame(new MemoryFrame(partitionMultiplier * i));
      } else {
        this.addNewMainFrame(new MemoryFrame(maxPartitionSize));
      }
    }
  }

  /**
   * Envia un proceso a la cola de asignacion
   * @date 2021-04-18
   * @param {any} process
   * @returns {any}
   */
  pushToQuewe(process) {
    this.quewe.push(process);
  }

  /**
   * realiza la asifgnacion de bloques de memoria a los procesos que estan en la cola y los que no cumplen las condiciones no salen de la cola
   * @date 2021-04-18
   * @param {sring} mode el algoritmo a utilizar first-fit, best-fit o next-fit
   * @returns {void}
   */
  alocate(mode = "first-fit") {
    switch (mode) {
      case "first-fit":
        this.firstFit();
        break;
      case "best-fit":
        this.bestFit();
        break;
      case "next-fit":
        this.nextFit();
        break;
    }
  }

  /**
   * saca de memoria principal a memoria virtual
   * @date 2021-04-18
   * @returns {any}
   */
  relocate() {
    // enviar a a memoria virtual
  }

  /**
   * elimina de la cola de procesos los procesos que ya fueron asignados a memoria
   * @date 2021-04-18
   * @returns {any}
   */
  purguequewe() {
    for (let key in this.mainMemory) {
      this.quewe.forEach((res)=>{
        if(res.id === this.mainMemory[key].pid){
          this.quewe.splice( this.quewe.indexOf(res ), 1 );
        }
      });      
    }
  }

  /**
   * asigna la memoria de los procesos haciendo uso del algorimo fisrt-fit
   * en el cual el proceso se asigna al primer bloque de memoria libre
   * @date 2021-04-18
   * @returns {void}
   */
  firstFit() {
    this.quewe.forEach((process) => {
      for (let key in this.mainMemory) {
        if (
          this.mainMemory[key].pid == -1 &&
          this.mainMemory[key].size >= process.mSize
        ) {
          this.mainMemory[key].pid = process.id;
          break;
        }
      }
    });    
    this.purguequewe();    
  }

  /**
   * asigna memoria a los procesos de la cola haciendo uso de el algoritmo best fit
   * el cual busca el bloque de memoria que mejor se ajuste a el tamaño del proceso de forma que
   * se desperdicie la menor cantidad de memoria posible.
   * @date 2021-04-18
   * @returns {any}
   */
  bestFit() {
    this.quewe.forEach((process) => {
      let fits = mapObject(this.mainMemory, function (frame, key) { return frame.size - process.mSize;   });      
      let positiveFits = omit(fits, function (value, key, object) {  return value < 0;  });      
      for (const key in fits) {
        if (!isEmpty(positiveFits)) {
          let lowest = Math.min.apply(null, values(positiveFits));          
          if (
            this.mainMemory[
              findKey(positiveFits, (val, key) => {
                return val == lowest;
              })
            ].pid == -1
          ) {
            this.mainMemory[
              findKey(positiveFits, (val, key) => {
                return val == lowest;
              })
            ].pid = process.id;
            break;
          }
          positiveFits = omit(positiveFits, (val, key) => {
            return val == lowest;
          });
        }
      }
    });    
    this.purguequewe();    
  }

  /**
   * asigna memoria mediante el algoritmo next fit
   * el cual consiste en asignar la memoria en el ultimo lugar del etremo que se asigno de ultimo
   * @date 2021-04-18
   * @returns {any}
   */
  nextFit() {
    this.quewe.forEach((process) => {
      console.log("alocating :", process);
      for (let key in this.mainMemory) {
        if (
          this.mainMemory[key].pid == -1 &&
          this.mainMemory[key].size >= process.mSize
        ) {
          this.mainMemory[key].pid = process.id;
          break;
        }
      }
      console.log("findelfor");
    });
    this.purguequewe();
  }
}

const genPseudoProcess = function (amount, minsize, maxsize) {
  let process = [];
  for (let index = 1; index <= amount; index++) {
    process.push(
      new Process(index, 1, 30, Math.floor(Math.random() * maxsize) + minsize)
    );
  }
  return process;
};

class MemoryFrame {
  /**
   *
   * @date 2021-04-18
   * @param {any} size tamaño del bloque de memoria
   * @param {any} pid  id del proceso al que esta asignado (-1 si no esta asignado a ningun proceso)
   * @returns {MemoryFrame}
   */
  constructor(size, pid = -1) {
    this.size = size;
    this.pid = pid;
  }
}

/**
 * funcion propia de P5js
 * @date 2021-04-18
 * @returns {any}
 */
function setup() {
  procesos = genPseudoProcess(20, 4, 512);
  console.log('procesos: ',procesos);
  createCanvas(1200, 900);
  //------------creamos un MMU configurada para trabajar con particiones fijas de valor fijo
  mmu = new Mmu("PFFV", 25, 250);
  mmu.quewe = [...procesos];
  mmu.alocate("first-fit");
  console.log('particion fija con valor fijo',mmu);
  //------------creamos un MMU configurada para trabajar con particiones fijas de valor Variable
  mmu2 = new Mmu("PFVV", 25, 100);  
  mmu2.quewe = [...procesos];
  mmu2.alocate("best-fit");
  console.log('particion fija con valor variable',mmu2);
  //------------creamos un MMU configurada para trabajar con particiones dinamicas
  dmmu = new Mmu("PD", 25, 100,[...procesos]);  
  dmmu.alocate("best-fit");
  console.log('particion dinamica',dmmu);
  //------------creamos un MMU configurada usar segmentacion simple
  ssmmu = new Mmu("SS", 25, 0,[...procesos],90);
  console.log('segmentacion simple',ssmmu);

}

function draw() {
  background(200);
  drawbase();
  drawTitles();
  drawPFFV();
  drawPFvV();
  drawPD();
  drawSS();
  
}

function drawbase(){
  stroke(0);
  fill(100);
  rect(0, 0, 1200, 100)
  fill(150);
  rect(0, 100, 300, 600);
  rect(300, 100, 300, 600);
  rect(600, 100, 300, 600);
  rect(900, 100, 300, 600);
  fill(230);
  rect(0, 700, 1200, 200);
}

function drawTitles(){
  textSize(28);
  fill(255);
  text('  PartFija con val fijo', 0, 40, 300, 40)
  text('  PartFija con val var', 300, 40, 600, 40)
  text('  Particion dinamica', 600, 40, 900, 40)
  text('  Segmentacion Simple', 900, 40, 1200, 40)
}

function drawPFFV(){
  let x = 0;
  let y = 100;
  let width = 300;
  let mheight = 900/(values(mmu.mainMemory).length)  
  mapObject(mmu.mainMemory,(frame,key)=>{
    try {
      framecolor = exToRGB(procesos.find((obj)=> obj.id == frame.pid).color) || exToRGB("#FFFFFF")
    } catch (error) {
      framecolor = exToRGB("#FFFFFF")
    } 
    strokeWeight(1)        
    fill(framecolor.r,framecolor.g,framecolor.b);
    rect(x, y, width, mheight);
    y += mheight;
  })
}

function drawPFvV(){
  let x = 300;
  let y = 100;
  let width = 300;
  let totalcounter = -0;
  mapObject(mmu2.mainMemory,(frame,key)=>{
    totalcounter += frame.size;
  });
  mapObject(mmu2.mainMemory,(frame,key)=>{
    try {
      framecolor = exToRGB(procesos.find((obj)=> obj.id == frame.pid).color) || exToRGB("#FFFFFF")
    } catch (error) {
      framecolor = exToRGB("#FFFFFF")
    }   
    strokeWeight(1)      
    fill(framecolor.r,framecolor.g,framecolor.b);
    let mheight = map(frame.size,0,totalcounter,0,900);    
    rect(x, y, width, mheight);
    y += mheight;
  });
}

function drawPD(){
  let x = 600;
  let y = 100;
  let width = 300;
  let totalcounter = -0;
  mapObject(dmmu.mainMemory,(frame,key)=>{
    totalcounter += frame.size;
  });
  mapObject(dmmu.mainMemory,(frame,key)=>{
    try {
      framecolor = exToRGB(procesos.find((obj)=> obj.id == frame.pid).color) || exToRGB("#FFFFFF")
    } catch (error) {
      framecolor = exToRGB("#FFFFFF")
    }
    strokeWeight(1)         
    fill(framecolor.r,framecolor.g,framecolor.b);
    let mheight = map(frame.size,0,totalcounter,0,900);    
    rect(x, y, width, mheight);
    y += mheight;
  });
}

function drawSS(){
  let x = 900;
  let y = 100;
  let width = 300;
  let totalcounter = -0;
  mapObject(ssmmu.mainMemory,(frame,key)=>{
    totalcounter += frame.size;
  });
  mapObject(ssmmu.mainMemory,(frame,key)=>{
    try {
      framecolor = exToRGB(procesos.find((obj)=> obj.id == frame.pid).color) || exToRGB("#FFFFFF")
    } catch (error) {
      framecolor = exToRGB("#FFFFFF")
    }        
    fill(framecolor.r,framecolor.g,framecolor.b);
    let mheight = map(frame.size,0,totalcounter,0,900);
    strokeWeight(0)    
    rect(x, y, width, mheight);
    y += mheight;
  });
}

function exToRGB(exColor){
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(exColor); 
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * metodo para obtener un color aleatorio
 * @date 2021-03-07
 * @returns {any}
 */
 function getRandomColor() {
  var letters = "0123456789ABCDEF";
  var color = "#";
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}
