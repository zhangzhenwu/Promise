let Promise = require('./Promise.js')
let p1 = new Promise(function(resolve,reject){
    setTimeout(()=>{
        let num = Math.random();
        if (num > .5) {
            resolve('成功')
        }else{
            reject('失败')
        }
    },1000)
});

p1.then((value)=>{
    console.log('成功'+value);
},(err)=>{
    console.log(err);
})