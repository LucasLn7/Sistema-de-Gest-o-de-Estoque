/* Alternância de tema da interface legada, baseada na classe claro e no botão toggleTema. O tema da interface atual é controlado por app.mjs. */
/** Alterna a classe de tema da página legada e ajusta o símbolo do botão. */
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