function alternarTema(){
    document.body.classList.toggle("claro")

    const botao = document.getElementById("toggleTema")

    if(document.body.classList.contains("claro")){
        botao.textContent = "🌕"
    }else{
        botao.textContent = "🌑"
    }
}
document.addEventListener("DOMContentLoaded",function(){

    const botao = document.getElementById("toggleTema")

    if(document.body.classList.contains("claro")){
        botao.textContent = "🌕"
    }else{
        botao.textContent = "🌑"
    }

})