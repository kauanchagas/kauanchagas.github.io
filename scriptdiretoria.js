     console.log("V1.5");
        
        document.getElementById("ano").textContent = new Date().getFullYear();

        let currentTopic = 'PESSOAS';
        let analiseCount = 3;

        document.addEventListener("DOMContentLoaded", function () {
            const dropdown = document.querySelector(".custom-dropdown");
            const toggle = document.querySelector(".dropdown-toggle");
            const menu = document.querySelector("#main_dropdown_menu");
            const topicButtons = document.querySelectorAll(".topic-btn");

            toggle.addEventListener("click", function() {
                dropdown.classList.toggle("dropdown-open");
            });

            topicButtons.forEach(button => {
                button.addEventListener("click", function() {
                    topicButtons.forEach(btn => btn.classList.remove('active'));
                    this.classList.add('active');
                    currentTopic = this.getAttribute('data-topic');
                    updateDropdownOptions();
                });
            });

            function updateDropdownOptions() {
                const allOptions = menu.querySelectorAll('.dropdown-option');
                allOptions.forEach(option => {
                    if (option.getAttribute('data-topic') === currentTopic) {
                        option.style.display = 'flex';
                    } else {
                        option.style.display = 'none';
                    }
                });
                
                document.getElementById("selected_text").textContent = 'Selecione o material desejado';
                $(".card").removeClass('show').hide();
                $('.button input[type="submit"]').hide();
            }

            updateDropdownOptions();

            initCustomDropdowns();
            
            const floatingMessage = document.getElementById("aviso");
            const closeButton = document.getElementById("f-aviso");
            const decorElement = document.querySelector('.decor-direita');

            closeButton.addEventListener("click", function () {
                floatingMessage.classList.add('closing');
                decorElement.classList.add('closing');

                floatingMessage.addEventListener('animationend', () => {
                    floatingMessage.style.display = "none";
                }, { once: true });

                decorElement.addEventListener('animationend', () => {
                    decorElement.style.display = "none";
                }, { once: true });
            });

            setTimeout(() => {
                floatingMessage.classList.add('closing');
                decorElement.classList.add('closing');
            }, 15000);
        });

        function initCustomDropdowns() {
            $('#main_dropdown_button').on('click', function() {
                const menu = $('#main_dropdown_menu');
                const button = $(this);
                
                menu.toggleClass('active');
                button.toggleClass('active');
            });

            $('.button input[type="submit"]').hide();
            
            $('#main_dropdown_menu .dropdown-option').on('click', function() {
              const value = $(this).data('value');
              const text = $(this).text();
              
              $('#selected_text').text(text);
              $('#main_dropdown_menu').removeClass('active');
              $('#main_dropdown_button').removeClass('active');
              $('.custom-dropdown').removeClass('dropdown-open');
              
              $('#main_dropdown_menu .dropdown-option').removeClass('selected');
              $(this).addClass('selected');
              
              $(".card").removeClass('show').hide();
              $('.button input[type="submit"]').hide();
              
              if (value) {
                  $("#" + value).addClass('show').show();
                  $("#" + value + " .button input[type='submit']").show();
              }
          });

            $(document).on('click', function(e) {
                if (!$(e.target).closest('.custom-dropdown').length) {
                    $('.dropdown-menu').removeClass('active');
                    $('.dropdown-button').removeClass('active');
                }
            });
        }
        
        function selectOption(button, targetId, value) {
            const container = button.parentElement;
            const buttons = container.querySelectorAll('.form-selector-button');
            buttons.forEach(btn => btn.classList.remove('selected'));
            
            button.classList.add('selected');
            
            document.getElementById(targetId).value = value;
        }

        function selectVeredicto(button, inputId, value) {
            const container = button.parentElement;
            const buttons = container.querySelectorAll('.form-selector-button');
            buttons.forEach(btn => btn.classList.remove('selected'));
            
            button.classList.add('selected');
            document.getElementById(inputId).value = value;
        }

        function addAnalise() {
            if (analiseCount >= 5) {
                alert('Máximo de 5 análises permitidas!');
                return;
            }
            
            analiseCount++;
            const container = document.getElementById('analises_container');
            
            const newAnalise = document.createElement('div');
            newAnalise.className = 'analise-item';
            
            newAnalise.innerHTML = `
                <h4>Análise ${analiseCount}</h4>
                <div class="input-box">
                    <span class="details_span">Veredito:</span>
                    <div class="form-selector-container">
                        <button type="button" class="form-selector-button" onclick="selectVeredicto(this, 'veredito_${analiseCount}', 'Deferido')">Deferido</button>
                        <button type="button" class="form-selector-button" onclick="selectVeredicto(this, 'veredito_${analiseCount}', 'Indeferido')">Indeferido</button>
                    </div>
                    <input type="hidden" id="veredito_${analiseCount}" name="veredito_${analiseCount}" required>
                </div>
                <div class="input-box">
                    <span class="details_span">Nickname do Analisador:</span>
                    <input type="text" id="nickname_${analiseCount}" placeholder="Digite o nickname" required>
                </div>
                <div class="input-box">
                    <span class="details_span">Comentário:</span>
                    <textarea id="comentario_${analiseCount}" rows="3" placeholder="Digite o comentário da análise" required></textarea>
                </div>
            `;
            
            container.appendChild(newAnalise);
            
            if (analiseCount >= 5) {
                document.getElementById('add_analise_btn').style.display = 'none';
            }
        }
        
        function showToast(message, isSuccess = true) {
            const toast = document.getElementById('toast-post');
            toast.querySelector('p').innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
        
        function enviarAvancoRegresso(e) {
            e.preventDefault();
            
            var nomeUsuario = $("#nome_usuario").val();
            var tipoAnalise = $("#tipo_analise").val();
            var turno = $("#turno").val();
            var horarioDisponivel = $("#horario_disponivel").val();
            var especializacao = $("#especializacao").val();
            var dataLimite = $("#data_limite").val();
            var horarioLimite = $("#horario_limite").val();
            var linkMotivos = $("#link_motivos").val();
            
            if (!nomeUsuario || !tipoAnalise || !turno || !horarioDisponivel || !especializacao || !dataLimite || !horarioLimite || !linkMotivos) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var textoCondicional = '';
            if (especializacao === 'intermediária' || (tipoAnalise === 'regresso' && especializacao === 'básica')) {
                textoCondicional = '\n\nVale ressaltar que a análise é obrigatória para [b]todos responderem[/b] se o/a executivo em análise [b]não tiver quórum suficiente[/b] para ser avaliado/a, ou seja, [b]não ter no mínimo um[/b] portador da Especialização Avançada que compartilhe o mesmo turno.';
            }
            
            var textoObrigatoriedade = '';
            if (tipoAnalise === 'avanço' && especializacao === 'avançada') {
                textoObrigatoriedade = 'A análise é [b]obrigatória[/b] aos diretores de todos os turnos e deve ser realizada em até [b]24 horas[/b], sob pena de recebimento de uma [b]advertência interna[/b] para aqueles que não o fizerem.';
            } else {
                textoObrigatoriedade = 'A análise é [b]obrigatória[/b] aos portadores da [b]Especialização Avançada[/b] ou diretores que são compatíveis ao [b]turno do executivo[/b] e deve ser realizada em até [b]24 horas[/b], sob pena de recebimento de uma [b]advertência interna[/b] para aqueles que não o fizerem.';
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]ANÁLISE DE AVANÇO OU REGRESSO[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Foi aberta uma análise de especialização para o [b]${tipoAnalise}[/b] do/a [b]${nomeUsuario}[/b] com horário disponível das [b]${horarioDisponivel}[/b] do turno da [b]${turno}[/b] para a [b]Especialização ${especializacao.charAt(0).toUpperCase() + especializacao.slice(1)}[/b]. ${textoObrigatoriedade}${textoCondicional}

Para realizar a análise, responda à [b]esta Mensagem[/b] Privada até o dia [b]${dataLimite} às ${horarioLimite} no horário de Brasília[/b]. Confira os motivos apresentados para o [b]${tipoAnalise}[/b] do/a ${nomeUsuario} [url=${linkMotivos}][b][color=green]clicando aqui[/color][/b][/url].[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MPGroup("[DIR] Análise de Avanço/Regresso", "146", mp);
        }
        
        function enviarColetaHorarios(e) {
            e.preventDefault();
            
            var dataLimite = $("#data_limite_coleta").val();
            var horarioLimite = $("#horario_limite_coleta").val();
            var linkFormulario = $("#link_formulario").val();
            
            if (!dataLimite || !horarioLimite || !linkFormulario) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]COLETA DE HORÁRIOS[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]A [b]Diretoria do Corpo Executivo[/b] informa que todos os portadores de Especialização Intermediária e Especialização Avançada devem responder ao formulário anexado, referente à Coleta de Horários, disponível ao final desta mensagem privada. O prazo para envio das respostas é até [b]${dataLimite} ${horarioLimite} (horário de Brasília).[/b][/justify]

[table  style="font-weight: 500; border-radius: 10px 10px 0px 0px; width: 40%; float: left; overflow: hidden;" bgcolor="#65b026"][tr][td style="overflow: hidden; padding: 2%"][font=Poppins][color=#FFFFFF][b]FUNCIONAMENTO DA COLETA DE HORÁRIOS NA AVALIAÇÃO[/b][/color][/font][/td][/tr][/table][table  style="font-weight: 500; border-radius: 0px 10px 10px 10px; width: 100%; overflow: hidden;" bgcolor="#f1f1f1"][tr][td style="overflow: hidden;"][justify][font=Poppins]O policial que responder à Coleta de Horários antes da avaliação, será avaliado exclusivamente acerca das informações dispostas. A avaliação será conduzida por portadores da Especialização Avançada que atuem nos mesmos turnos, observando que:

[b]a)[/b] Portadores da Especialização Avançada que [b]compartilhem[/b] horários com o policial poderão [b]julgar[/b] a sua presença na base.
[b]b)[/b] Portadores da Especialização Avançada que [b]não compartilhem horários[/b] com o policial não poderão comentar [b]negativamente[/b] sobre sua presença na base, mas [b]o avaliarão normalmente[/b].

O policial que [b]não responder à Coleta de Horários[/b] será considerado presente em todos os seus turnos informados no RCCSystem [b]integralmente[/b] e avaliado por todos os portadores da Especialização Avançada do(s) turno(s) correspondente(s), incluindo[b] a presença na base[/b].[/font][/justify][/td][/tr][/table]
[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fas  fa-file-import"></i>[color=black]___[/color] Para responder o formulário, [url=${linkFormulario}][b][color=white]clique aqui.[/color][/b][/url][/td][/tr][/table][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MPGroup("[DIR] Coleta de Horários - Leitura Obrigatória", "268", mp);
        }
        
        function enviarPromocoesBloqueadas(e) {
            e.preventDefault();
            
            var especializacao = $("#especializacao_bloqueada").val();
            
            if (!especializacao) {
                alert('Por favor, selecione a especialização afetada!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]PROMOÇÕES BLOQUEADAS[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]A [b]Diretoria do Corpo Executivo[/b] comunica que os portadores da especialização [b]${especializacao}[/b] não poderão ser promovidos até segunda ordem. Essa medida visa preservar a integridade das avaliações realizadas pelo órgão, que estão prestes a ocorrer, e evitar qualquer interferência externa.

Promoções que envolvam policiais com as especializações mencionadas serão canceladas caso sejam realizadas após o envio desta mensagem privada, e o responsável pelo requerimento poderá ser punido pelo crime de [b]Abandono de Dever/Negligência[/b]. Em caso de dúvidas, entre em contato com a [b]Diretoria do Corpo Executivo[/b].[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MPGroup("[DIR] Promoções Bloqueadas - Leitura Obrigatória", "268", mp);
            send_MPGroup("[DIR] Promoções Bloqueadas - Leitura Obrigatória", "272", mp);
        }
        
        function enviarPromocoesDesbloqueadas(e) {
            e.preventDefault();
            
            var especializacao = $("#especializacao_desbloqueada").val();
            
            if (!especializacao) {
                alert('Por favor, selecione a especialização desbloqueada!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]PROMOÇÕES DESBLOQUEADAS[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]A [b]Diretoria do Corpo Executivo[/b] comunica que as promoções dos portadores da especialização [b]${especializacao}[/b] agora podem ser realizadas após o fim do período avaliativo. Resultados das avaliações se encontram no [url=https://www.policiarcc.com/f864-diario-oficial-diretoria-avaliacoes][b][color=#4b8410][Diário Oficial] - Diretoria: Avaliações.[/color][/b][/url]. Caso algum executivo avaliado se sinta lesionado com a nota, o veredito ou os comentários recebidos em suas avaliações, deverá interpor recurso. Para isso, acesse a [b][url=https://www.policiarcc.com/t38726-ce-central-de-sindicancias][CE] Central de Sindicâncias[/url][/b]. 

A leitura das avaliações realizadas pela Diretoria do Corpo Executivo é essencial quando se tratar de subalternos com especialização intermediária ou avançada, especialmente para embasar decisões sobre promoções ou outras ações relevantes. Além disso, caso você seja um dos avaliados, é importante analisar atentamente os comentários recebidos, a fim de identificar eventuais deficiências e corrigi-las.[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MPGroup("[DIR] Promoções Desbloqueadas - Leitura Obrigatória", "268", mp);
            send_MPGroup("[DIR] Promoções Desbloqueadas - Leitura Obrigatória", "272", mp);
        }
        
        function enviarAvaliacaoEspecializacao(e) {
            e.preventDefault();
            
            var tipoAvaliacao = $("#tipo_avaliacao").val();
            var especializacao = $("#especializacao_avaliacao").val();
            var dataLimite = $("#data_limite_avaliacao").val();
            var horarioLimite = $("#horario_limite_avaliacao").val();
            var linkFormulario = $("#link_formulario_avaliacao").val();
            
            if (!tipoAvaliacao || !especializacao || !dataLimite || !horarioLimite || !linkFormulario) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var textoObrigatoriedade = '';
            var textoPunicao = '';
            var usergroup = '';
            
            if (especializacao === 'intermediária') {
                textoObrigatoriedade = 'É [b]dever[/b] de todos os portadores da [b]Especialização Avançada[/b]';
                textoPunicao = 'Está passível de punição, [b]conforme a gravidade[/b], o portador da Especialização Avançada que:';
                usergroup = '718';
            } else {
                textoObrigatoriedade = 'É [b]dever[/b] de todos os [b]diretores[/b]';
                textoPunicao = 'Está passível de punição, [b]conforme a gravidade[/b], o Diretor que:';
                usergroup = '146';
            }
            
            var mp = `[table style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]AVALIAÇÃO ${tipoAvaliacao.toUpperCase()} DA ESPECIALIZAÇÃO ${especializacao.toUpperCase()}[/font][/size][/b][/color][/center][/td][/tr][/table]

[table style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]A seguir, estará disposto o [b]formulário de avaliação[/b] dos [b]oficiais do Corpo Executivo[/b] que possuem [b]Especialização ${especializacao.charAt(0).toUpperCase() + especializacao.slice(1)}[/b], os quais estão divididos entre turnos. ${textoObrigatoriedade} ativos, com exceção daqueles que estão isentos [b]de acordo[/b] com as normativas presentes no tópico [url=https://www.policiarcc.com/t38732-ce-regulamento-de-avaliacoes][b][color=green][CE] Regulamento de Avaliações[/color][/b][/url], responder à avaliação. ${textoPunicao}
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border: none!Important; overflow: hidden;"][color=white][b]01[/b][/color][/td][/tr][/table] Não responder à avaliação até o dia [b]${dataLimite} às ${horarioLimite} (horário de Brasília)[/b], sujeito a advertência escrita;
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border: none!Important; overflow: hidden;"][color=white][b]02[/b][/color][/td][/tr][/table] [b]Falsificar informações[/b] no formulário, seja tal realizado de [b]forma intencional[/b] ou com base numa avaliação realizada de [b]forma rasa/equivocada[/b], sujeito a advertência interna;
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border: none!Important; overflow: hidden;"][color=white][b]03[/b][/color][/td][/tr][/table] Sair em licença [b]após o recebimento[/b] desta Mensagem Privada, sem ter a [b]dispensa da Presidência deste órgão[/b] para responder à avaliação, sujeito a advertência interna;
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border: none!Important; overflow: hidden;"][color=white][b]04[/b][/color][/td][/tr][/table] [b]Deixar de avaliar[/b] algum executivo que esteja nos [b]parâmetros expostos no formulário da avaliação[/b], sujeito ao recebimento de 50 medalhas negativas efetivas por executivo não avaliado.

[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fas fa-file-import"></i>[color=black]___[/color] Para acessar o formulário de avaliação da Especialização ${especializacao.charAt(0).toUpperCase() + especializacao.slice(1)}, [url=${linkFormulario}][b][color=white]CLIQUE AQUI[/color][/b][/url][/td][/tr][/table][/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MPGroup("[DIR] Avaliação de Especialização - Leitura Obrigatória", usergroup, mp);
        }
        
        function enviarMelhoresQuinzena(e) {
            e.preventDefault();
            
            var linkFormulario = $("#link_formulario_melhores").val();
            
            if (!linkFormulario) {
                alert('Preencha o link do formulário!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]MELHORES DA QUINZENA[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, através desta Mensagem Privada, que a [b]Diretoria do Corpo Executivo[/b] anuncia mais uma vez a [b]abertura das votações[/b] para os [b]Melhores da Quinzena[/b]!

É importante que você vote com [b]consciência[/b] e [b]imparcialidade[/b] naquele que lhe apresenta ter um excelente trabalho. Uma gratificação importante está em suas mãos! Em caso de dúvidas, procure a [b]Diretoria do Corpo Executivo[/b].

[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fas  fa-file-import"></i>[color=black]___[/color] [color=white]Para exercer seu direito e votar nos Melhores Executivos da Quinzena,[/color] [url=${linkFormulario}][b]clique aqui[/b][/url][/td][/tr][/table]
[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fas  fa-file-import"></i>[color=black]___[/color] Para ser direcionado ao tópico com algumas regras e prazos, [url=https://www.policiarcc.com/t32828-rcc-votacao-dos-melhores-executivos-da-quinzena][b][color=white]clique aqui[/color][/b][/url][/td][/tr][/table][/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MPGroup("[DIR] Melhores da Quinzena - Votação", "3", mp);
            send_MPGroup("[DIR] Melhores da Quinzena - Votação", "10", mp);
            send_MPGroup("[DIR] Melhores da Quinzena - Votação", "5", mp);
            send_MPGroup("[DIR] Melhores da Quinzena - Votação", "13", mp);
            send_MPGroup("[DIR] Melhores da Quinzena - Votação", "31", mp);
        }
        
        function enviarAvaliacaoProjetos(e) {
            e.preventDefault();
            
            var prazoHoras = $("#prazo_horas").val();
            var horarioLimite = $("#horario_limite_projetos").val();
            var linkPlanilha = $("#link_planilha").val();
            
            if (!prazoHoras || !horarioLimite || !linkPlanilha) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]AVALIAÇÃO DE PROJETOS[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, através desta Mensagem Privada, que os projetos enviados na [b]Ouvidoria do Corpo Executivo[/b] devem ser avaliados em até [b]${prazoHoras} horas (${prazoHoras} às ${horarioLimite} BR)[/b] do recebimento desta Mensagem Privada na planilha anexada abaixo.
Preencha corretamente a sua página no tempo hábil. A [b]não avaliação de quaisquer projetos[/b] resultará no recebimento de uma [b]advertência interna[/b] na Diretoria por [b]Abandono de dever/Negligência[/b]. Quaisquer dúvidas ou reivindicações, procure a [b]Presidência[/b].

[table class="rank instable"  style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fas  fa-file-import"></i>[color=black]___[/color] Para acessar a planilha vigente da avaliação de projetos, [url=${linkPlanilha}][b][color=white]clique aqui[/color][/b][/url].[/td][/tr][/table][/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;

            showLoading();
            send_MPGroup("[DIR] Avaliação de Projetos", "146", mp);
        }
        
        function enviarAnaliseIndeferida(e) {
            e.preventDefault();
            
            var username = $("#username_indeferida").val();
            
            if (!username) {
                alert('Preencha o nome do usuário!');
                return;
            }
            
            let analiseValida = false;
            let analisesBBCode = '';
            
            for (let i = 1; i <= analiseCount; i++) {
                const veredito = document.getElementById(`veredito_${i}`);
                const nickname = document.getElementById(`nickname_${i}`);
                const comentario = document.getElementById(`comentario_${i}`);
                
                if (veredito && nickname && comentario && 
                    veredito.value && nickname.value.trim() && comentario.value.trim()) {
                    
                    analiseValida = true;
                    
                    if (veredito.value === 'Deferido') {
                        analisesBBCode += `[table style="width: 80px; border-radius: 5px!Important; overflow: hidden;border: none !important; border-radius: 5px; padding-top: 10px;position: relative;top: 2.4em; left: 4.5em;margin: -3em; display: ruby-text; z-index: 10;" bgcolor="green"][tr style="overflow: hidden; border: none!important;"][td style="overflow: hidden; border: none!important; padding-top: 25px;"][color=white]<i class="fas fa-check"></i> DEFERIDO[/color][/td][/tr][/table]
[table style="overflow: hidden; border: none!important; box-shadow: 0 0 0 1px green; border-radius: 5px!Important;"][tr style="overflow: hidden; border: none!important; border-radius: 5px!important;"][td style="overflow: hidden; border: none!important;"]
[justify][b]${nickname.value}:[/b] ${comentario.value}[/justify][/td][/tr][/table]

`;
                    } else {
                        analisesBBCode += `[table style="width: 80px; border-radius: 5px!Important; overflow: hidden;border: none !important; border-radius: 5px; padding-top: 10px;position: relative;top: 2.4em; left: 4.5em;margin: -3em; display: ruby-text; z-index: 10;" bgcolor="red"][tr style="overflow: hidden; border: none!important;"][td style="overflow: hidden; border: none!important; padding-top: 25px;"][color=white]<i class="fas fa-times"></i> INDEFERIDO[/color][/td][/tr][/table]
[table style="overflow: hidden; border: none!important; box-shadow: 0 0 0 1px red; border-radius: 5px!Important;"][tr style="overflow: hidden; border: none!important; border-radius: 5px!important;"][td style="overflow: hidden; border: none!important;"]
[justify][b]${nickname.value}:[/b] ${comentario.value}[/justify][/td][/tr][/table]

`;
                    }
                }
            }
            
            if (!analiseValida) {
                alert('Preencha pelo menos uma análise completa (veredito, nickname e comentário)!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]ANÁLISE INDEFERIDA[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Por meio desta Mensagem Privada, comunico-lhe que a sua análise solicitada foi [b]processada[/b] pela [b]Diretoria do Corpo Executivo[/b]. Segue abaixo o resultado das análises:

[justify][spoiler="Análises"]
${analisesBBCode}[/spoiler][/justify]

[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fas  fa-file-import"></i>[color=black]___[/color] [color=white]Para abrir uma nova análise ou entrar em contato com o diretor responsável,[/color] [url=https://www.policiarcc.com/t23956-rcc-abertura-de-analises][b]clique aqui[/b][/url][/td][/tr][/table][/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Análise Processada", username, mp);
        }
        
        function enviarAnaliseNegada(e) {
            e.preventDefault();
            
            var username = $("#username_negada").val();
            var motivoTexto = $("#motivo_negacao_texto").val();
            
            if (!username || !motivoTexto) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]ANÁLISE NEGADA[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, através desta Mensagem Privada, que sua [b]solicitação[/b] de análise de avanço foi [b]negada[/b] devido à [b]ausência[/b] de [b]um ou mais[/b] dos [b]requisitos obrigatórios[/b] para a solicitação ser considerada para análise. No seu caso, a problemática foi devido a/ao [b]${motivoTexto}[/b].

[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fas  fa-file-import"></i>[color=black]___[/color] [color=white]Para abrir uma nova análise ou entrar em contato com o diretor responsável,[/color] [url=https://www.policiarcc.com/t23956-rcc-abertura-de-analises][b]clique aqui[/b][/url].[/td][/tr][/table][/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Análise Negada", username, mp);
        }
        
        function enviarRegressoEspecializacao(e) {
            e.preventDefault();
            
            var username = $("#username_regresso").val();
            var motivoRegresso = $("#motivo_regresso").val();
            var especializacao = $("#especializacao_regresso").val();
            var linkComprovacao = $("#link_comprovacao").val();
            
            if (!username || !motivoRegresso || !especializacao || !linkComprovacao) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]REGRESSO DE ESPECIALIZAÇÃO[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, através desta Mensagem Privada, que você sofreu um regresso de especialização devido a/ao [b]${motivoRegresso}[/b]. Portanto, agora, você se torna portador da [b]Especialização ${especializacao}[/b].

[b]Comprovação: [url=${linkComprovacao}]Clique aqui.[/url][/b] 

Em caso de dúvidas, entre em contato com a [b]Diretoria do Corpo Executivo[/b]. Para interposição de recursos, acesse a [b][url=https://www.policiarcc.com/t23956-rcc-abertura-de-analises]Ouvidoria do Corpo Executivo[/url][/b].[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Regresso de Especialização", username, mp);
        }
        
        function enviarCartaObservacao(e) {
            e.preventDefault();
            
            var username = $("#username_observacao").val();
            
            if (!username) {
                alert('Preencha o nome do usuário!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]CARTA DE OBSERVAÇÃO[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, por meio desta [b]carta[/b], que, conforme a avaliação realizada, você obteve o veredito de observação, seja por prevalência ou por maioria. Em decorrência disso, sua promoção está bloqueada por sete dias a partir da data desta Mensagem Privada. Você deverá ser acompanhado por um membro do Esquadrão de Corpo Executivo ou da Especialização Avançada. Em breve, um deles entrará em contato com você.

Caso não deseje o acompanhamento, este é um direito seu. No entanto, ficará sob sua responsabilidade resolver os pontos em déficit indicados na avaliação. Se não concordar com alguma nota, comentário ou com o próprio veredito, você poderá interpor recurso, acessando a [b][url=https://www.policiarcc.com/t23956-rcc-abertura-de-analises]Ouvidoria do Corpo Executivo[/url][/b].[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Carta de Observação", username, mp);
        }
        
        function enviarCartaAdvertencia(e) {
            e.preventDefault();
            
            var username = $("#username_advertencia").val();
            var dataInicial = $("#data_inicial").val();
            var dataFinal = $("#data_final").val();
            var motivo = $("#motivo_advertencia").val();
            var linkAdvertencia = $("#link_advertencia").val();
            
            if (!username || !dataInicial || !dataFinal || !motivo || !linkAdvertencia) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]CARTA DE ADVERTÊNCIA INTERNA[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]
    
[justify]Informo-lhe, através desta Mensagem Privada, que você recebeu uma [b]advertência interna[/b] no [b][Esp.III] Quadro de Advertências[/b] devido a/ao [b]${motivo}[/b]. Quaisquer dúvidas ou vindicações, procure a [b]Presidência da Diretoria do Corpo Executivo[/b].
    
[b]Início/Término da Advertência:[/b] ${dataInicial} até ${dataFinal}
[b]Comprovação:[/b] [url=${linkAdvertencia}]Clique aqui.[/url][/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Carta de Advertência Interna", username, mp);
        }
        
        function enviarPromocao(e) {
            e.preventDefault();
            
            var username = $("#username_promocao").val();
            var tipoAvaliacao = $("#tipo_avaliacao_promocao").val();
            
            if (!username || !tipoAvaliacao) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]PROMOÇÃO[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, através desta Mensagem Privada, que você foi [b]promovido[/b] pela [b]Diretoria do Corpo Executivo[/b] devido ao seu veredito na última [b]avaliação ${tipoAvaliacao}[/b]! Para conferir os [b]motivos[/b] e os [b]vereditos[/b] na avaliação, leia em: [url=https://www.policiarcc.com/f864-diario-oficial-diretoria-avaliacoes][b][color=#4b8410][Diário Oficial] - Diretoria: Avaliações[/color][/b][/url].[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Promoção", username, mp);
        }
        
        function enviarAvancoEspecializacao(e) {
            e.preventDefault();
            
            var username = $("#username_avanco").val();
            var tipoAvanco = $("#tipo_avanco").val();
            
            if (!username || !tipoAvanco) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = '';
            if (tipoAvanco === 'basica_intermediaria') {
                mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]AVANÇO DE ESPECIALIZAÇÃO[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[center][b]Prezado, oficial executivo {USERNAME}. Parabéns pelo avanço de especialização![/b][/center]

[justify][font=Poppins]Quando for adicionado ao subfórum [b][Corpo Executivo] Especialização[/b], deverá ler obrigatoriamente os seguintes tópicos: [b][Esp. II] Regulamento Interno[/b], localizado em [Corpo Executivo] Especialização Intermediária, e [b][CE] Regulamento de Avaliações[/b], disponível no próprio subfórum. Salienta-se que, a partir desse momento, você assumirá mais responsabilidades, entre elas:
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border:  none!Important; overflow: hidden;"][color=white][b]01[/b][/color][/td][/tr][/table] Manter seus turnos e tarefas atualizados, sob pena de advertência escrita, caso não atualize em até 48 horas;
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border:  none!Important; overflow: hidden;"][color=white][b]02[/b][/color][/td][/tr][/table] Manter presença em base, conhecimento elevado sobre os documentos, pulso firme, rigidez, boa ortografia, postura, ajudar e gratificar seus subalternos, como todo e qualquer bom oficial;
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border:  none!Important; overflow: hidden;"][color=white][b]03[/b][/color][/td][/tr][/table] Ao promover, conferir corretamente os requisitos do promovido e, caso necessite, deter da permissão para tal;
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border:  none!Important; overflow: hidden;"][color=white][b]04[/b][/color][/td][/tr][/table] Acompanhar os resultados da [b]Avaliação Quinzenal[/b] em [url=https://docs.google.com/spreadsheets/d/1qrOXiYUh8KZpPJmU0VGMlZ5xkLEPLLmHrP9LgxQzYDI/edit#gid=0]Planilha de Avaliações[/url];
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border:  none!Important; overflow: hidden;"][color=white][b]05[/b][/color][/td][/tr][/table] Não passar mais de 72 horas offline sem um pedido de licença da especialização no RCCSystem em: [url=https://rccsystem.com/]RCCSystem[/url].

[color=green][b]GRUPO DE COMUNICAÇÃO[/B][/COLOR]
Atualmente, a Especialização Intermediária, dispõe de um grupo no WhatsApp, sendo gerenciado pela Diretoria do Corpo Executivo, para estimular a comunicação entre os oficiais sobre os assuntos pertinentes à instituição, de exemplo, é comum haver debates em base das palestras, dos acompanhamentos e outrem realizados por outros policiais. É importante que o portador saiba explorar esse grupo para exercer a comunicatividade e o interesse no que envolve sobre a polícia. Para entrar nesse grupo, o convite está disposto abaixo:

[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fab  fa-whatsapp"></i>[color=black]___[/color] Para acessar o [b]grupo oficial[/b] da Especialização Intermediária, entre [url=https://chat.whatsapp.com/LqDTt49ttxGLRGxJCqYmZR]aqui[/url].[/td][/tr][/table]

            [color=green][b]ATIVIDADES QUINZENAIS[/B][/COLOR]
            A Diretoria do Corpo Executivo organiza atividades voltadas para o aperfeiçoamento dos portadores da especialização intermediária, como resoluções de casos, discussões e outras dinâmicas inovadoras. A data e horário das atividades são previamente notificadas por mensagem privada. Essas atividades são [b]obrigatórias[/b] e, portanto, a sua participação é indispensável.

            No entanto, caso não possa comparecer, é necessário justificar a ausência utilizando o formulário disponibilizado pelo órgão, o qual deve ser respondido num prazo de 24 horas a partir do horário inicial da atividade. Faltas não justificadas resultarão em advertência escrita por Abandono de Dever/Negligência.

            [color=#cb1717][b]FICHAMENTO POLICIAL[/B][/COLOR]
            [font=Poppins][table style="overflow: hidden; border: none!important; border-radius: 5px!important;" bgcolor="#cb1717"][tr style="overflow: hidden; border: none!important;"][td style="overflow: hidden;  border: none!important;"][justify][color=white][color=#cb1717]___[/color]<i class="fas fa-exclamation"></i> [color=#cb1717]___[/color] Você [b]deve[/b] realizar seu [b]fichamento policial[/b] em até [b]48 horas[/b] a contar do recebimento desta Mensagem Privada, sob pena de [b]advertência escrita[/b] por [b]Abandono de Dever/Negligência[/b], caso não o faça. Para realizá-lo, [color=white][url=https://www.policiarcc.com/t36126-csi-fichamento-policial]acesse o fichamento[/url].[/color][/color][/justify][/td][/tr][/table][/font][/justify][/font][/td][/tr][/table]


            [color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
            [/td][/tr][/table][/td][/tr][/table]`;
            } else if (tipoAvanco === 'intermediaria_avancada') {
                mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]AVANÇO DE ESPECIALIZAÇÃO[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[center][b]Prezado, oficial executivo {USERNAME}. Parabéns pelo avanço de especialização![/b][/center]

[justify][font=Poppins]É com grande satisfação que parabenizamos você por conquistar a Especialização Avançada. Essa conquista representa o reconhecimento pela sua dedicação, competência e comprometimento com a excelência do Corpo Executivo. Quando for adicionado ao subfórum [b][Corpo Executivo] Especialização Avançada.[/b], deverá ler os tópicos [b][Esp.III] Regimento Interno[/b] e [b][Esp.III] Regimento de Análises.[/b], além dos manuais em [b][Esp.III] Manuais e Apostilas[/b].

A partir deste momento, além de manter os deveres e privilégios da especialização intermediária, você assume novas e importantes responsabilidades:
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border:  none!Important; overflow: hidden;"][color=white][b]01[/b][/color][/td][/tr][/table] Possui o poder e o dever de avaliar quinzenalmente os executivos com Especialização Intermediária do seu turno;
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border:  none!Important; overflow: hidden;"][color=white][b]02[/b][/color][/td][/tr][/table] Deve responder às análises de avanço abertas para a Especialização Intermediária do seu turno;
[table style="width: 20px; display: math; position: relative; border-radius: 5px; border: none!Important; padding-top: 12px; top: 8px;" bgcolor="#65b026"][tr style="border: none!Important; overflow: hidden;"][td style="border:  none!Important; overflow: hidden;"][color=white][b]03[/b][/color][/td][/tr][/table] Tem autonomia para promover praças e oficiais de ambos os corpos, sem necessidade de permissão;

[color=green][b]AVALIAÇÕES QUINZENAIS E ANÁLISES DE AVANÇO[/B][/COLOR]
A utilização de sua visão administrativa procura a identificação e a resolução de erros. Sendo assim, é necessário ter a percepção necessária para identificar as problemáticas, além disso, a capacidade necessária, através de sua proatividade, para resolvê-los da maneira correta, embasando suas decisões com os argumentos precisos. Logo, entende-se que, para utilizar a sua visão administrativa corretamente, é necessária uma avaliação minuciosa de seus subalternos, o desempenho apresentado por estes em todas as características necessárias. 

De início, a fim de explorar e potencializar a sua visão administrativa e resolução de casos, a polícia conta com as avaliações quinzenais e mensais da Diretoria do Corpo Executivo, além das análises de avanço, onde deve avaliar o desempenho de seus subalternos ao longo da quinzena, enfatizando os pontos a serem melhorados e, corrigindo-os através da manutenção do Corpo. Neste prisma, um dos pontos fundamentais para a execução correta de sua avaliação ao longo da quinzena, é a organização dos dados expostos pelos seus subalternos, como: funções assumidas, atividades realizadas, promoções, gratificações e demais observações.

A organização pode be feita através de uma planilha com as características, provas e observações coletadas ou, por meio de um documento, onde deve adicionar/modificar/remover as informações necessárias. Além disso, a motivação para a organização is pautada na sua responsabilidade como superior na especialização, você é quem deve dar o feedback, suporte e ferramentas necessárias para o desenvolvimento de seu subalterno.

E como faria isso sem se organizar? Portanto, utilize da organização dos fatos expostos pelos seus subalternos para uma avaliação precisa, justa e com suas opiniões transparecidas com embasamento de argumentos. Após a sua avaliação, converse com os seus subordinados para ter certeza de que entenderam os pontos supracitados por você acerca do trabalho apresentado por eles durante a quinzena. Em casos de maiores dificuldades observadas, apresente a sua visão administrativa para realizar atividades que potencializam e desenvolvem os seus subalternos sobre a característica em que apresentaram mau desempenho.

Portanto, a avaliação de subalternos é um ponto principal para ser exercido pelos membros da Especialização Avançada, uma vez que são um dos responsáveis pela manutenção do Corpo Executivo, devem estar atentos às suas movimentações ao longo do tempo: acompanhamentos, auxílios e atividades realizadas, para executar o seu ponto de vista e trabalhar juntamente com os portadores da especialização intermediária, sendo, de fato, o líder que a Polícia Militar Revolução Contra o Crime precisa, ao formar executivos aptos para a continuidade da excelência buscada pela Especialização Intermediária

[color=green][b]GRUPO DE COMUNICAÇÃO[/B][/COLOR]
Atualmente, a Especialização Avançada, dispõe de um grupo no WhatsApp, sendo gerenciado pela Diretoria do Corpo Executivo, para estimular a comunicação entre os oficiais sobre os assuntos pertinentes à instituição. Para entrar nesse grupo, o convite está disposto abaixo:

[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fab  fa-whatsapp"></i>[color=black]___[/color] Para acessar o [b]grupo oficial[/b] da Especialização Avançada, entre [url=https://chat.whatsapp.com/IWqpuTU55OQBewMzbcDxYF]aqui[/url].[/td][/tr][/table]

[color=green][b]SENSO CRÍTICO E PROMOÇÕES[/B][/COLOR]
Como membro da Especialização Avançada, possui mais autonomia para integrar novos policiais no Corpo de Oficiais, tanto no Corpo Executivo como também no Corpo Militar e aplicar medidas administrativas caso haja escassez de policiais nessa posição hierárquica. No entanto, não é o suficiente apenas saber dessas responsabilidades: é crucial entender como executá-las. Isso requer um aspecto fundamental em qualquer oficial: o senso crítico. Seja para conduzir movimentações hierárquicas, como promoções ou punições, ou para realizar avaliações quinzenais e resoluções de casos, o senso crítico é essencial.

O senso crítico significa a capacidade de questionar e analisar de forma racional e inteligente. A palavra "crítico" vem de origem grega como "kritikos", que significa "a capacidade de fazer julgamentos". Esse significado da origem grega, é o que deve ser colocado em pauta para os portadores da especialização avançada. A habilidade para realizar avaliações críticas é importante para qualquer policial, mas a partir de possuir a especialização avançada, eles têm que dominar proficientemente para as ações realizadas estarem condizentes com os documentos e uma avaliação minuciosa em aspecto de meritocracia (isso se envolver promoções ou benefícios).

O senso crítico também é fundamental para as avaliações dos portadores da especialização intermediária ministradas pela Diretoria do Corpo Executivo, afinal, é a partir desta característica, que poderá dar um veredito e a pontuação apropriada mediante aos comentários que você julgou ser a influência de serem tais na sua concepção. É importante ser imparcial, fazer o balanço de pontos positivos e negativos e dar o resultado mediante a situação que seu subalterno apresenta.

O portador da especialização avançada tem a responsabilidade de avaliar tudo que envolve o subalterno na especialização, em todos os aspectos. É preciso ter abundantemente todas as evidências, informações ou testemunhas que podem notabilizar a capacidade de algum aspecto do subalterno. Se há por qualquer falha, seja uma ou mais, for existir no subalterno e que essas precisam ser dominadas naquele cargo ou na especialização, automaticamente, não é apto para ascender de cargo ou de especialização, mesmo que haja aspectos deste que o destaque dos demais.

Além disso, para evitar discordâncias de visões, não que deve ser influenciado para impedir a promoção ou avanço de especialização do seu subalterno, mas buscar o que outros superiores hierárquicos acham deste no turno que este subalterno escolheu no RCCSystem e se possuem provas de tais atos que podem ser obstáculos impeditivos para a ascensão. O portador da especialização avançada não deve tornar-se exclusivamente dependente de opiniões terceiras para decidir, deve confiar plenamente na sua capacidade de julgamento e analisar todas as informações que estão disponíveis a mercê do policial.

O subalterno precisa estar apto quando for promovê-lo, para assumir as responsabilidades como oficial e não possuir brechas que podem ser usadas para finalidade de cancelamento de subida do grau hierárquico, afinal, é sua responsabilidade de evitar esse tipo de caso, caso contrário, poderá surtir consequências negativas ao seu subalterno, como a desmotivação ou perca da produtividade e esforço. É importante ressaltar que os critérios de promoção ou avanço de especialização devem ser cuidadosamente examinados e considerar todos os aspectos relevantes, mesmo que não sejam o fator primordial que desencadeou a promoção ou avanço. Essa abordagem visa reduzir a margem para interpretações ambíguas, como mencionado anteriormente, e garantirá a aceitação por parte daqueles que revisam os motivos pelos quais a promoção foi aprovada e avançou. Os motivos devem abordar desempenho nos grupos de tarefas, comportamento, características dos oficiais, conhecimento de documentos e outros elementos pertinentes – existem critérios a se avaliar para avanço de especialização no tópico [b][Esp.III] Regimento de Análises[/b] no qual devem ler.[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            }
            
            showLoading();
            send_MP("[DIR] Avanço de Especialização", username, mp);
        }
        
        function enviarCartaProjetoAprovado(e) {
            e.preventDefault();
            
            var username = $("#username_projeto").val();
            var numeroProposta = $("#numero_proposta").val();
            var statusAprovacao = $("#status_aprovacao").val();
            var numeroMedalhas = $("#numero_medalhas").val();
            
            if (!username || !numeroProposta || !statusAprovacao || !numeroMedalhas) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]CARTA DE PROJETO APROVADO[/font][/size][/b][/color][/center][/td][/tr][/table]

[table style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, por meio desta [b]carta[/b], que, conforme a proposta [b]${numeroProposta}[/b] na Ouvidoria, você obteve o veredito de [b]${statusAprovacao}[/b], pela decisão do Presidente e Vice-Presidente da Diretoria do Corpo Executivo. Agradecemos imensamente por sua valiosa contribuição ao Corpo Executivo. Que esse comprometimento continue a se refletir em suas futuras atuações. Em reconhecimento a esse mérito, serão concedidas a você ${numeroMedalhas} medalhas temporárias pela proposta apresentada.[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Carta de Projeto Aprovado", username, mp);
        }
        
        function enviarCartaProjetoReprovado(e) {
            e.preventDefault();
            
            var username = $("#username_projeto_reprovado").val();
            var numeroProposta = $("#numero_proposta_reprovado").val();
            var motivoReprovacao = $("#motivo_reprovacao").val();
            
            if (!username || !numeroProposta || !motivoReprovacao) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]CARTA DE PROJETO REPROVADO[/font][/size][/b][/color][/center][/td][/tr][/table]

[table style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, por meio desta [b]carta[/b], que, conforme a proposta [b]${numeroProposta}[/b] na Ouvidoria, infelizmente, você obteve o veredito de [b]reprovado[/b], pela decisão do Presidente e Vice-Presidente da Diretoria do Corpo Executivo. Todavia, agradecemos imensamente por sua valiosa contribuição ao Corpo Executivo. Que esse comprometimento continue a se refletir em suas futuras atuações. Segue a síntese de por qual razão decidimos reprovar a proposta em questão:

[quote][b]Síntese de reprovação:[/b] ${motivoReprovacao}[/quote][/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Carta de Projeto Reprovado", username, mp);
        }
        
        function enviarCartaTransparenciaSindicancial(e) {
            e.preventDefault();
            
            var username = $("#username_sindicancia").val();
            var nomeApelante = $("#nome_apelante").val();
            var codigoIdentificacao = $("#codigo_identificacao").val();
            var parecerSindicancia = $("#parecer_sindicancia").val();
            var comentarioFundamentacao = $("#comentario_fundamentacao").val();
            
            if (!username || !nomeApelante || !codigoIdentificacao || !parecerSindicancia || !comentarioFundamentacao) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]CARTA DE TRANSPARÊNCIA SINDICANCIAL[/font][/size][/b][/color][/center][/td][/tr][/table]

[table style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, por meio desta [b]carta[/b], que a sindicância requerida por [b]${nomeApelante}[/b], na qualidade de [b]apelante[/b], sob o código de identificação [b]${codigoIdentificacao}[/b], foi devidamente analisada. Após apreciação, a Diretoria do Corpo Executivo, por decisão conjunta de seu Presidente e Vice-Presidente, deliberou pelo [b]${parecerSindicancia}[/b] da solicitação.

[table style="width: 80px; border-radius: 5px!Important; overflow: hidden;border: none !important; border-radius: 5px; padding-top: 10px;position: relative;top: 2.4em; left: 4.5em;margin: -3em; display: ruby-text; z-index: 10;" bgcolor="#212121"][tr style="overflow: hidden; border: none!important;"][td style="overflow: hidden; border: none!important; padding-top: 25px;"][color=white]<i class="fas fa-user-cog"></i> FUNDAMENTAÇÃO DA PRESIDÊNCIA[/color][/td][/tr][/table]
[table style="overflow: hidden; border: none!important; box-shadow: 0 0 0 1px #212121; border-radius: 5px!Important;"][tr style="overflow: hidden; border: none!important; border-radius: 5px!important;"][td style="overflow: hidden; border: none!important;"]
[justify]${comentarioFundamentacao}[/justify][/td][/tr][/table]

Se uma das ambas partes não estiver satisfeita com o parecer, você poderá interpor recurso à segunda instância, acessando a [b][url=https://www.policiarcc.com/t23956-rcc-abertura-de-analises]Ouvidoria do Corpo Executivo[/url][/b].[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Carta de Transparência Sindicancial", username, mp);
        }
        
        function enviarCartaIntimacao(e) {
            e.preventDefault();
            
            var username = $("#username_intimacao").val();
            var tipoProcesso = $("#tipo_processo").val();
            var motivo = $("#motivo_intimacao").val();
            
            if (!username || !tipoProcesso || !motivo) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var tipoTexto = tipoProcesso === 'análise de regresso' ? 'análise de regresso de especialização' : 'sindicância';
            var tipoTitulo = tipoProcesso === 'análise de regresso' ? 'Análise de Regresso' : 'Sindicância';
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]CARTA DE INTIMAÇÃO[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, através desta [b]intimação[/b], que foi aberta uma [b]${tipoTexto}[/b] pelos motivos expostos abaixo. Sendo assim, você tem o prazo de [b]24 horas[/b] a partir do recebimento desta intimação para enviar sua [b]defesa[/b], caso queira.Em caso de dúvidas, procure a [b]Presidência da Diretoria do Corpo Executivo[/b].

[spoiler="${tipoTitulo}"]${motivo}[/spoiler][/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MP("[DIR] Carta de Intimação", username, mp);
        }
        
        function enviarEscalaFuncoes(e) {
            e.preventDefault();
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]ATUALIZAÇÃO DA ESCALA DE FUNÇÕES[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, através desta Mensagem Privada, que a escala de funções foi atualizada! Confira sua função para realizar as atividades programadas. Qualquer dúvida, procure a secretária responsável pelo seu setor ou a presidência do órgão.[/justify]

[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fas  fa-file-import"></i>[color=black]___[/color] Para visualizar a [b]escala de funções[/b], acesse [url=https://docs.google.com/spreadsheets/d/1GYUxpAR2QHpKfR5fVocE9he2c-Pm3INuU-vlMVAjS5U/]a planilha oficial[/url].[/td][/tr][/table][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MPGroup("[DIR] Atualização da Escala de Funções", "146", mp);
        }
        
        function enviarAtividadeQuinzenal(e) {
            e.preventDefault();
            
            var dataAtividade = $("#data_atividade").val();
            var horarioAtividade = $("#horario_atividade").val();
            
            if (!dataAtividade || !horarioAtividade) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]ATIVIDADE QUINZENAL[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]A [b]Diretoria do Corpo Executivo[/b], informa que no dia [b]${dataAtividade}[/b], às [b]${horarioAtividade}[/b], será realizada a atividade quinzenal obrigatória destinada a todos os [b]portadores da Especialização Intermediária[/b].

Os executivos que não puderem comparecer deverão [b]justificar obrigatoriamente[/b] sua ausência em até [b]24 horas após a data e o horário de início da atividade[/b]. Caso contrário, estarão sujeitos a receber uma [b]advertência escrita[/b] pelo crime de [b]Abandono de Dever/Negligência[/b].

[table class="rank instable" style=" border-radius: 5px!important; border: none!important; margin: 0em; font-weight: 500; line-height: 0em;" bgcolor="black"][tr style="border: none;"][td style="border: none!important;"]<i class="fas  fa-file-import"></i>[color=black]___[/color] Para justificar a sua falta, acesse o tópico [url=https://www.policiarcc.com/t30642-rcc-justificativa-de-faltas]oficial de justificativas[/url].[/td][/tr][/table][/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MPGroup("[DIR] Atividade Quinzenal", "268", mp);
        }
        
        function enviarReuniaoGeral(e) {
            e.preventDefault();
            
            var dataReuniao = $("#data_reuniao").val();
            var horarioReuniao = $("#horario_reuniao").val();
            
            if (!dataReuniao || !horarioReuniao) {
                alert('Preencha todos os campos!');
                return;
            }
            
            var mp = `[table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.1em" bgcolor="#65b026"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][table  style="border: none!important; overflow: hidden; border-radius: 5px; line-height: 0.6em; margin: -10px;" bgcolor="#212121"][tr style="overflow: hidden; border: none !important;"][td style="border: none!important; overflow: hidden"][img]https://i.imgur.com/8RaCNua.png[/img]
[table  style="border: none!important; border-radius: 5px; overflow: hidden; width: 40%; margin: -2% auto; top: 0.8em; position: relative; z-index: 10; justify-content: center; box-shadow: -8px 0px 0px 0px #4b8410, 1px 4px 16px 0px #53891b6e, -1px -4px 14px 0px #00ff1473;" bgcolor="#65b026"][tr style="border: none!important;"][td style="border: none!important;"][center][color=white][b][size=16][font=Poppins]REUNIÃO GERAL[/font][/size][/b][/color][/center][/td][/tr][/table]

[table  style="width: 100%; border-radius: 5px; border-bottom: none!important; border-top: none!Important; border-right: none!important; border-left: 5px solid #65b026!important; overflow: hidden; position: relative; z-index: 1;line-height: 1.6em; margin: 0 auto; border-top: 3px solid #212121!important; box-shadow: -8px 0px 0px 0px #65b026;" bgcolor="#ffffff"][tr style="border: none!important; overflow: hidden"][td style="border: none!important; overflow: hidden"]
[font=Poppins][center][b][color=#4b8410]Saudações, {USERNAME}![/color][/b][/center]

[justify]Informo-lhe, através desta Mensagem Privada, que a [b]Diretoria do Corpo Executivo[/b] vem convocá-lo para uma [b]reunião geral do Corpo Executivo[/b] no dia [b]${dataReuniao}, ${horarioReuniao} no horário de Brasília[/b]. Sua presença é de suma importância.

Vale ressaltar que a presença de [b]todos os portadores da Especialização Intermediária e Especialização Avançada é obrigatória[/b] na data mencionada nesta Mensagem Privada, estando sujeitos ao recebimento de uma [b]advertência escrita[/b] por [b]Abandono de Dever/Negligência[/b] caso não compareçam. Aqueles que, por algum motivo, não puderem comparecer, [b]devem justificar[/b] sua ausência no [b]formulário[/b] presente no tópico [url=https://www.policiarcc.com/t30642-rcc-justificativa-de-faltas]oficial de justificativas[/url].[/justify][/font][/td][/tr][/table]


[color=white][font=Poppins][color=#4b8410]<i class="fas fa-code"></i>[/color] por [b]Aloscon[/b] | Todos os direitos reservados à [b]Diretoria do Corpo Executivo[/b].[/font][/color]
[/td][/tr][/table][/td][/tr][/table]`;
            
            showLoading();
            send_MPGroup("[DIR] Reunião Geral", "268", mp);
        }
        
        function send_MP(title, user, message){
            showLoading();
            
            $.post('/privmsg',{
                folder: 'inbox',
                mode: 'post',
                post: '1',
                username: user,
                subject: title,
                message: message
                }).done(function () {
                hideLoading();
                showToast("Mensagem enviada!");
                }).fail(function (){
                hideLoading();
                alert("Erro");
            })
        }
        
        function send_MPGroup(title, usergroup, message){
            showLoading();
            
            $.post('/privmsg',{
                folder: 'inbox',
                mode: 'post',
                post: '1',
                usergroup: usergroup,
                subject: title,
                message: message
                }).done(function () {
                hideLoading();
                showToast("Mensagem enviada!");
                }).fail(function (){
                hideLoading();
                alert("Erro");
            })
        }
        
        function showLoading() {
            var existingLoading = document.getElementById('loading-overlay');
            if (existingLoading) {
                existingLoading.remove();
            }
            
            var loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999999;
                backdrop-filter: blur(5px);
            `;
            
            var loadingContainer = document.createElement('div');
            loadingContainer.style.cssText = `
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(248, 248, 248, 0.9));
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
                border: 3px solid rgba(144, 238, 144, 0.6);
                min-width: 300px;
            `;
            
            var spinner = document.createElement('div');
            spinner.style.cssText = `
                width: 50px;
                height: 50px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #7CB342;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            `;
            
            var loadingText = document.createElement('p');
            loadingText.textContent = 'ENVIANDO...';
            loadingText.style.cssText = `
                color: #2C2C2C;
                font-family: 'Poppins', sans-serif;
                font-size: 18px;
                font-weight: 600;
                margin: 0;
            `;
            
            if (!document.getElementById('loading-styles')) {
                var styles = document.createElement('style');
                styles.id = 'loading-styles';
                styles.textContent = `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            loadingContainer.appendChild(spinner);
            loadingContainer.appendChild(loadingText);
            loadingOverlay.appendChild(loadingContainer);
            document.body.appendChild(loadingOverlay);
        }
        
        function hideLoading() {
            var loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
        }
        
        function showToast(message, isSuccess = true) {
            const toast = document.getElementById('toast-post');
            toast.querySelector('p').innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
            toast.classList.add('show');
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }