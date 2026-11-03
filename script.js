
// Teste inicial
let vertices = [
    { id: "A", x: 0, y: 0 },
    { id: "B", x: 3, y: 0 },
    { id: "C", x: 3, y: 4 },
    { id: "D", x: 0, y: 4 }
];

let deposito = "A";

//----------------------------------------------------

const distancias=[];
const feromonios=[];

let tau0 = 1;
let alfa = 1;
let beta = 2;
let rho = 0.5;
let Q = 14;

let numeroIteracoes = 30;
let numeroFormigas = 10;

let semente = 42;

const PISO_FEROMONIO = 1e-12;

let iteracaoAtual = 0;
let melhorRota = null;
let melhorDistancia = Infinity;
let historico = [];

let logsExecucao = [];

//Criar aleatorio
function criarGerador(seed){
    let estado = seed;

    return function(){
        estado = (estado * 9301 + 49297) % 233280;
        return estado / 233280;
    };
}

let aleatorio = criarGerador(semente);

//Criação dos grafos:
function calcularDistancia(v1,v2){ 

    const dx=v1.x-v2.x;
    const dy=v1.y-v2.y;

    return Math.sqrt(dx*dx + dy*dy);
}

function matrizDistancias(){

    for(let i=0; i<vertices.length; i++){
        distancias[i]=[];

        for(let j=0; j<vertices.length; j++){
            distancias[i][j]=calcularDistancia(vertices[i], vertices[j]);
        }
    }

    console.log("Matriz de distâncias:")

    for(let i=0; i<distancias.length; i++){
        console.log(distancias[i]);
    }

    return distancias;
}

function matrizFeromonios(){
    for(let i=0; i<vertices.length; i++){
        feromonios[i]=[];

        for(let j=0; j<vertices.length; j++){

            if(i===j){
                feromonios[i][j] = 0;

            } else{

                feromonios[i][j]=tau0;
            }
        }
    }

    console.log("Matriz de feromônios:", feromonios);
    return feromonios;
}

//Construção das Rotas
function calcularProbabilidades(atual, naoVisitados){
    const pesos =[];
    let somaDosPesos = 0;

    for(let j of naoVisitados){
        const peso = Math.pow(feromonios[atual][j],alfa) * Math.pow(1/(distancias[atual][j]),beta);

        pesos.push({vertice: j, peso: peso})
        somaDosPesos += peso;
    }

    return pesos.map(item => ({vertice: item.vertice, probabilidade: item.peso / somaDosPesos}));
}

function sortearProximoVertice(probabilidades){
    const sorteio = aleatorio();
    let acumulado =0;

    for (const item of probabilidades){
        acumulado += item.probabilidade;

        if (sorteio < acumulado){
            return item.vertice;
        }
    }

    return probabilidades[probabilidades.length - 1].vertice;
}

function construirRota(){
    const inicio = vertices.findIndex(v => v.id === deposito);
    const visitados = new Array(vertices.length).fill(false);
    const rota = [inicio];

    logsExecucao.push("Formiga " + numeroFormiga + ":");

    visitados[inicio] = true;
    let atual = inicio;

    while(rota.length<vertices.length){

        const naoVisitados = [];

        for (let i = 0; i < vertices.length; i++){

            if (!visitados[i]){
                naoVisitados.push(i);
            }
        }

        const probabilidades = calcularProbabilidades(atual, naoVisitados);
        const proximo = sortearProximoVertice(probabilidades);

        logsExecucao.push("Saiu de " + vertices[atual].id +" | Probabilidades: " +probabilidades.map(p =>vertices[p.vertice].id + ": " + (p.probabilidade * 100).toFixed(2) + "%"
        ).join(", ") +" | Escolheu: " + vertices[proximo].id);

        rota.push(proximo);
        visitados[proximo] = true;
        atual = proximo;
    }

    rota.push(inicio);//Retornando para o depósito
    return rota;
}

function calcularComprimentoRota(rota){
    let comprimento = 0;

    for (let i = 0; i < rota.length - 1; i++){

        comprimento += distancias[rota[i]][rota[i + 1]];
    }

    return comprimento;
}

//Atualizando os feromônios
function evaporarFeromonios(){

    for (let i = 0; i < vertices.length; i++){

        for (let j = i + 1; j < vertices.length; j++){

            const novoValor = Math.max(PISO_FEROMONIO,feromonios[i][j] * (1 - rho));
            let antes = feromonios[i][j];

            feromonios[i][j] = novoValor;
            feromonios[j][i] = novoValor;

            logsExecucao.push("Evaporação: " + vertices[i].id + "-" + vertices[j].id + 
                " | " + antes.toFixed(6) + " → " + feromonios[i][j].toFixed(6));

        }
    }
}

function depositarFeromonios(rotas){

    for (const formiga of rotas){

        const depositoFormiga = Q / formiga.distancia;
        const arestasPercorridas = new Set();

        for (let i = 0; i < formiga.rota.length - 1; i++){
            const a = Math.min(formiga.rota[i], formiga.rota[i + 1]);
            const b = Math.max(formiga.rota[i], formiga.rota[i + 1]);
            const chave = a + "-" + b;

            if (!arestasPercorridas.has(chave)){
                feromonios[a][b] += depositoFormiga;
                feromonios[b][a] = feromonios[a][b];

                logsExecucao.push("Depósito: " + vertices[a].id + "-" + vertices[b].id + " | +" + depositoFormiga.toFixed(6));

                arestasPercorridas.add(chave);
            }
        }
    }
}

function atualizarFeromonios(rotas){
    evaporarFeromonios();
    depositarFeromonios(rotas);

    for (let i = 0; i < vertices.length; i++){

        for (let j = i + 1; j < vertices.length; j++){
            feromonios[i][j] = Math.max(PISO_FEROMONIO, feromonios[i][j]);
            feromonios[j][i] = feromonios[i][j];
        }
    }
}

//Melhor rota 
function atualizarMelhorRota(rotas){

    for (const formiga of rotas){

        if (formiga.distancia < melhorDistancia){

            melhorDistancia = formiga.distancia;
            melhorRota = [...formiga.rota];
        }
    }
}

function registrarResultados(rotas){

    const distanciasRotas = rotas.map(formiga => formiga.distancia);
    let menorDistancia = Infinity;

    for (const distancia of distanciasRotas){

        if (distancia < menorDistancia){
            menorDistancia = distancia;
        }
    }

    const mediaDistancias =distanciasRotas.reduce((soma, d) => soma + d, 0)/distanciasRotas.length;

    historico.push({iteracao: iteracaoAtual,menorDistancia: menorDistancia,mediaDistancias: mediaDistancias,
        melhorDistancia: melhorDistancia,melhorRota: melhorRota.map(i => vertices[i].id)});
}


//Execução 
function executarIteracao(){
    if (iteracaoAtual >= numeroIteracoes){
        return null;
    }

    const rotas = [];

    for (let i = 0; i < numeroFormigas; i++){

        const rota = construirRota(i + 1);
        const distancia = calcularComprimentoRota(rota);

        rotas.push({ rota: rota,distancia: distancia});
    }

    iteracaoAtual++;
    atualizarMelhorRota(rotas);
    registrarResultados(rotas);
    atualizarFeromonios(rotas);

    return rotas;
}

function executarAlgoritmo(){
    reiniciarAlgoritmo();

    while (iteracaoAtual < numeroIteracoes){
        executarIteracao();
    }

    console.log("Melhor rota:", melhorRota.map(i => vertices[i].id));
    console.log("Melhor distância:", melhorDistancia);
    console.log("Histórico:", historico);

    return{rota: melhorRota,distancia: melhorDistancia,historico: historico};
}

function avancarIteracao(){
    return executarIteracao();
}

function reiniciarAlgoritmo(){
    melhorRota = null;
    melhorDistancia = Infinity;
    historico = [];
    iteracaoAtual = 0;
    logsExecucao = [];

    aleatorio = criarGerador(semente);

    matrizDistancias();
    matrizFeromonios();
}

//Validação
function validarVertices(){

    if (vertices.length < 4 || vertices.length > 12){
        return false;
    }

    const identificadores = new Set();
    const coordenadas = new Set();

    for (const v of vertices){

        if (!v.id || identificadores.has(v.id)){
            return false;
        }

        if (!Number.isFinite(v.x) ||!Number.isFinite(v.y) ||v.x<0 ||v.x>1000 ||v.y<0 || v.y>1000){
            return false;
        }

        const coordenada = v.x + "," + v.y; 

        if (coordenadas.has(coordenada)){
            return false;
        }

        identificadores.add(v.id);
        coordenadas.add(coordenada);
    }

    return vertices.some(v => v.id === deposito);
}

function validarParametros(){
    return (
        Number.isInteger(numeroFormigas) && numeroFormigas >= 1 && numeroFormigas <= 100 &&

        Number.isInteger(numeroIteracoes) &&numeroIteracoes >= 1 &&numeroIteracoes <= 200 &&

        Number.isFinite(alfa) &&alfa >= 0 && alfa <= 5 &&

        Number.isFinite(beta) &&beta >= 0 && beta <= 5 &&

        Number.isFinite(rho) &&rho >= 0 && rho <= 0.9 &&

        Number.isFinite(tau0) && tau0 >= 0.01 && tau0 <= 100 &&

        Number.isFinite(Q) &&Q >= 0.01 && Q <= 10000 &&

        Number.isInteger(semente)
    );
}

function lerParametros() {

    numeroFormigas = Number(document.getElementById("numeroFormigas").value);
    numeroIteracoes = Number(document.getElementById("numeroIteracoes").value);

    alfa = Number(document.getElementById("alfa").value);
    beta = Number(document.getElementById("beta").value);
    rho = Number(document.getElementById("rho").value);
    tau0 = Number(document.getElementById("tau0").value);
    Q = Number(document.getElementById("Q").value);

    semente = Number(document.getElementById("semente").value);
}

function atualizarTela(){
    document.getElementById("iteracao").textContent ="Iteração: " + iteracaoAtual;
    document.getElementById("melhorRota").textContent = "Melhor rota: " + melhorRota.map(i => vertices[i].id).join(" -> ");
    document.getElementById("melhorDistancia").textContent ="Distância: " + melhorDistancia.toFixed(2);
    document.getElementById("historico").innerHTML = "";

    for (const resultado of historico){

        document.getElementById("historico").innerHTML += "<p>Iteração " + resultado.iteracao +
            " | Melhor distância: " + resultado.melhorDistancia.toFixed(2) +" | Média: " + resultado.mediaDistancias.toFixed(2) + "</p>";
    }

    document.getElementById("logs").innerHTML = logsExecucao.map(log => "<p>" + log + "</p>").join("");

    desenharGrafo();
}

document.getElementById("executar").addEventListener("click", function(){
    lerParametros();

    if (validarVertices() && validarParametros()){
        executarAlgoritmo();
        atualizarTela();
    } else {
        alert("Existem parâmetros inválidos.");
    }
});

document.getElementById("avancar").addEventListener("click", function(){

    if (iteracaoAtual < numeroIteracoes){
        avancarIteracao();
        atualizarTela();
    }
});

document.getElementById("reiniciar").addEventListener("click", function(){
    lerParametros();

    if (validarVertices() && validarParametros()){
        reiniciarAlgoritmo();

        document.getElementById("melhorRota").textContent = "Melhor rota: --";
        document.getElementById("melhorDistancia").textContent = "Distância: --";
        document.getElementById("iteracao").textContent = "Iteração: 0";
        document.getElementById("historico").innerHTML = "";
        document.getElementById("logs").innerHTML = "";
        desenharGrafo();

    } else {
        alert("Existem parâmetros inválidos.");
    }
});

reiniciarAlgoritmo();
desenharGrafo();

function desenharGrafo(){
    let html = '<svg width="100%" height="400" viewBox="0 0 600 400">';

    let menorX = Math.min(...vertices.map(v => v.x));
    let maiorX = Math.max(...vertices.map(v => v.x));
    let menorY = Math.min(...vertices.map(v => v.y));
    let maiorY = Math.max(...vertices.map(v => v.y));

    function posicaoX(x){
        if (maiorX === menorX) return 300;
        return 50 + (x - menorX) / (maiorX - menorX) * 500;
    }

    function posicaoY(y){
        if (maiorY === menorY) return 200;
        return 50 + (y - menorY) / (maiorY - menorY) * 300;
    }

    for (let i = 0; i < vertices.length; i++){
        for (let j = i + 1; j < vertices.length; j++){
            let x1 = posicaoX(vertices[i].x);
            let y1 = posicaoY(vertices[i].y);
            let x2 = posicaoX(vertices[j].x);
            let y2 = posicaoY(vertices[j].y);

            let melhorAresta = false;

            if (melhorRota !== null){
                for (let k = 0; k < melhorRota.length - 1; k++){
                    if (
                        (melhorRota[k] === i && melhorRota[k + 1] === j) ||
                        (melhorRota[k] === j && melhorRota[k + 1] === i)
                    ) {
                        melhorAresta = true;
                    }
                }
            }

            let cor = melhorAresta ? "#c940d5" : "gray";
            let largura = melhorAresta ? 4 : 2;

            html += `<line x1="${x1}" y1="${y1}"x2="${x2}" y2="${y2}"
            stroke="${cor}" stroke-width="${largura}"/>`;    


            let meioX = (x1 + x2) / 2;
            let meioY = (y1 + y2) / 2;

            html += `<text x="${meioX}" y="${meioY - 5}"
                text-anchor="middle" fill="black" font-size="12">
                ${feromonios[i][j].toFixed(2)}
            </text>`;
        }
    }

    for (let v of vertices){
        let x = posicaoX(v.x);
        let y = posicaoY(v.y);
        let cor = v.id === deposito ? "orange" : "green";
        let nome = v.id === deposito ? v.id + " (Depósito)" : v.id;

        html += `<circle cx="${x}" cy="${y}" r="12" fill="${cor}"/>`;
        html += `<text x="${x}" y="${y - 18}" text-anchor="middle">${nome}</text>`;
    }

    html += '</svg>';
    document.getElementById("grafo").innerHTML = html;
}

function atualizarListaVertices(){
    let select = document.getElementById("selecionarVertice");
    let lista = document.getElementById("listaVertices");

    select.innerHTML = "";
    lista.innerHTML = "";

    for (let v of vertices) {
        select.innerHTML += `<option value="${v.id}">${v.id}</option>`;
        lista.innerHTML += `<p>${v.id} - X: ${v.x}, Y: ${v.y}
            ${v.id === deposito ? "(Depósito)" : ""}</p>`;
    }
}

function adicionarVertice(){
    let id = document.getElementById("idVertice").value.trim();
    let x = Number(document.getElementById("coordX").value);
    let y = Number(document.getElementById("coordY").value);

    if (document.getElementById("coordX").value.trim() === "" || document.getElementById("coordY").value.trim() === "") {
        alert("Preencha as duas coordenadas.");
        return;
    }

    if (vertices.length >= 12 || !id ||vertices.some(v => v.id === id) ||!Number.isFinite(x) || !Number.isFinite(y) ||
        x < 0 || x > 1000 || y < 0 || y > 1000 ||vertices.some(v => v.x === x && v.y === y)){

        alert("Dados inválidos ou limite de vértices atingido.");
        return;
    }

    vertices.push({ id, x, y });
    finalizarAlteracaoVertices();
}

function editarVertice(){
    let id = document.getElementById("selecionarVertice").value;
    let v = vertices.find(v => v.id === id);

    let x = Number(document.getElementById("coordX").value);
    let y = Number(document.getElementById("coordY").value);

    if (document.getElementById("coordX").value.trim() === "" || document.getElementById("coordY").value.trim() === "") {
        alert("Preencha as duas coordenadas.");
        return;
    }

    if (!v || !Number.isFinite(x) || !Number.isFinite(y) ||
        x < 0 || x > 1000 || y < 0 || y > 1000 ||
        vertices.some(outro => outro !== v && outro.x === x && outro.y === y)) {
        alert("Coordenadas inválidas.");
        return;
    }

    v.x = x;
    v.y = y;
    finalizarAlteracaoVertices();
}

function removerVertice(){
    let id = document.getElementById("selecionarVertice").value;

    if (vertices.length <= 4){
        alert("O grafo precisa ter pelo menos 4 vértices.");
        return;
    }

    vertices = vertices.filter(v => v.id !== id);

    if (deposito === id){
        deposito = vertices[0].id;
    }

    finalizarAlteracaoVertices();
}

function definirDeposito(){

    deposito = document.getElementById("selecionarVertice").value;
    finalizarAlteracaoVertices();
}

function finalizarAlteracaoVertices(){

    reiniciarAlgoritmo();
    atualizarListaVertices();

    document.getElementById("melhorRota").textContent = "Melhor rota: --";
    document.getElementById("melhorDistancia").textContent = "Distância: --";
    document.getElementById("iteracao").textContent = "Iteração: 0";
    document.getElementById("historico").innerHTML = "";

    desenharGrafo();
}

document.getElementById("adicionarVertice").addEventListener("click", adicionarVertice);
document.getElementById("editarVertice").addEventListener("click", editarVertice);
document.getElementById("removerVertice").addEventListener("click", removerVertice);
document.getElementById("definirDeposito").addEventListener("click", definirDeposito);

atualizarListaVertices();