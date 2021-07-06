// ==UserScript==
// @name         Aliexpress bad seller shower
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Показывает плохих продавцов на Aliexpress
// @author       Andronio
// @homepage     https://github.com/Andronio2/Aliexpress-bad-seller-shower
// @supportURL   https://github.com/Andronio2/Aliexpress-bad-seller-shower/issues
// @updateURL    https://github.com/Andronio2/Aliexpress-bad-seller-shower/blob/main/Aliexpress%20bad%20seller%20shower.user.js
// @downloadURL  https://github.com/Andronio2/Aliexpress-bad-seller-shower/blob/main/Aliexpress%20bad%20seller%20shower.user.js
// @match        *aliexpress.com/item/*
// @match        *aliexpress.ru/item/*
// @exclude      *m.aliexpress.com/*
// @exclude      *m.aliexpress.ru/*
// @icon         https://www.google.com/s2/favicons?domain=aliexpress.com
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';
/*
 * Настройки
 */

const showNeutral = true;
const bad         = '#F1948A';
const good        = '#82E0AA';
const neutral     = '#EAECEE';

/*
 * Дальше не трогать
 */

    let title = document.querySelector('.product-title');
    if (!title) title = document.querySelector('.Name-module_container__1UjDF');
    if (!title) return;
    let mass = localStorage.getItem('bad_seller_mass');
    if (mass) {
        try {
            mass = JSON.parse(mass);
        } catch {
            mass = [];
        }
    } else mass = [];
    /* mass
   |-storeId
   |-status
   |-msg
*/
    let buttonStyle = '';
    let storeId = window.runParams && window.runParams.data && window.runParams.data.actionModule && window.runParams.data.actionModule.storeNum;
    if (!storeId) {
        storeId = document.querySelector('.StoreInfo-module_storeName__345FS a');
        if (storeId) {
            storeId = storeId.href.match(/\/store\/(\d+)/);
        } else return;
        if (storeId.length > 1) {
          storeId = storeId[1];
          buttonStyle = 'Button-module__size-l___3BakgC Button-module__primary___2VJAz4';
        }
    } else buttonStyle = 'next-btn next-small next-btn-primary';
    if (!storeId) return;
    console.log('storeId = ' + storeId);

    const clearTitle = () => {
        if (title.classList.contains('bad-seller-bad')) title.classList.remove('bad-seller-bad');
        if (title.classList.contains('bad-seller-good')) title.classList.remove('bad-seller-good');
        if (title.classList.contains('bad-seller-neutral')) title.classList.remove('bad-seller-neutral');
        if (title.hasAttribute('title')) title.removeAttribute('title');
    };

    const paintTitle = () => {
        let result = mass.find( el => el.storeId == storeId );
        if (result !== undefined) {
            if (result.status == 'bad') {
                title.classList.add('bad-seller-bad');
            }
            if (result.status == 'good') {
                title.classList.add('bad-seller-good');
            }
            if (result.msg) title.setAttribute('title', result.msg);
        } else {
            if (showNeutral) title.classList.add('bad-seller-neutral');
        }
    }

    paintTitle();

    let styles = `
            .bad-seller-bad{
                background: ${bad};
            }
            .bad-seller-good{
                background: ${good};
            }
            .bad-seller-neutral{
                background: ${neutral};
            }
            .bad-seller-window{
                height: 17rem;
                width: 45ch;
                background: #EAECEE;
                position: fixed;
                left: 50%;
                top: 200px;
                border: solid black 1px;
                z-index: 20;
                padding: 10px;
             }
             .bad-seller-section{
                padding: 10px;
             }

            `;

    let styleSheet = document.createElement('style');
    styleSheet.type = "text/css";
    styleSheet.innerHTML = styles;
    document.head.append(styleSheet);

    let tripleClick = false;
    title.addEventListener('click', function (evt) {
        if (evt.detail === 2) {
            setTimeout( () => {
                if (!tripleClick) {console.log('double click!'); addToMass();}
                tripleClick = false;
            }, 600);
        }
        if (evt.detail === 3) {
            console.log('triple click!');
            tripleClick = true;
            if (evt.offsetX < evt.target.clientWidth / 2) {
                console.log('load');
                loadFileToMass();
            } else {
                console.log('save');
                saveMassToFile();
            }
        }
    });

    function addToMass() {
        let div = document.createElement('div');
        div.className = 'bad-seller-window';
        div.innerHTML = `
        <div class="bad-seller-section">
            <input type="radio" name="badsellerradio" value="bad" checked> Плохой <input type="radio" name="badsellerradio" value="good"> Хороший <input type="radio" name="badsellerradio" value="neutral"> Удалить
        </div>
        <div><textarea rows="10" cols="45" id="bad-seller-textarea" placeholder="Введите комментарий"></textarea></div>
        <div><button data-action="ok" class="${buttonStyle}">OK</button> <button data-action="cancel" class="${buttonStyle}">Отмена</button></div>
        `;
        document.body.append(div);
        document.getElementById('bad-seller-textarea').focus();
        div.addEventListener('click', function buttonHandler(evt) {
            if (evt.target.tagName != 'BUTTON') return;
            //debugger;
            div.removeEventListener('click', buttonHandler);
            if (evt.target.dataset.action == "cancel") {div.remove(); return;}
            if (evt.target.dataset.action == "ok") {
                const msg = document.getElementById('bad-seller-textarea').value;

                const findIdInMass = () => {
                    return mass.findIndex( el => el.storeId == storeId);
                };

                const fillOldIndex = (i, status) => {
                    mass[i].status = status;
                    mass[i].msg = msg
                }

                const fillNewIndex = status => {
                    let newObj = {
                        status,
                        storeId,
                        msg
                    };
                    mass.push(newObj);
                }

                const changeInMass = status => {
                    const index = findIdInMass();
                    if (index == -1) {
                        fillNewIndex(status);
                    } else {
                        fillOldIndex(index, status);
                    }
                };

                const radio = document.querySelectorAll('input[name="badsellerradio"]');
                if (radio[0].checked == true) {
                    // Плохой
                    changeInMass('bad');
                }
                if (radio[1].checked == true) {
                    // Хороший
                    changeInMass('good');
                }
                if (radio[2].checked == true) {
                    // Нейтральный
                    const index = findIdInMass();
                    if (index == -1) return;
                    mass.splice(index, 1);
                }
                clearTitle();
                paintTitle();
                div.remove();
                localStorage.setItem('bad_seller_mass', JSON.stringify(mass));
                return;
            }
        });
    }

    function saveMassToFile() {
        let file = new Blob([JSON.stringify(mass)], {type: 'text/plain'});
        let a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = 'bad_sellers.txt';
        document.body.append(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }

    function loadFileToMass() {
        var input = document.createElement('input');
        input.type = 'file';

        input.onchange = e => {
            let file = e.target.files[0];
            if (!file.type.match('text.*')) {
                return alert(file.name + " is not a valid text file.");
            }
            let reader = new FileReader();
            reader.readAsText(file,'UTF-8');
            reader.onload = readerEvent => {
                let content = readerEvent.target.result; // this is the content!
                console.log( content );
                try {
                    mass = JSON.parse(content);
                } catch {
                    return alert('Ошибка в файле');
                }
                localStorage.setItem('bad_seller_mass', content);
                clearTitle();
                paintTitle();

            }
            reader.onerror = () => {
                return alert('Ошибка: ' + reader.error);
            }
        }
        input.click();
    }

})();
