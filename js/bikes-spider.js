(function () {
    //需要爬的自行车总数
    var count = 0;
    //当前爬成功的条数
    var successedCount = 0;
    //当前爬取失败的条数
    var failedCount = 0;

    var produceImage = false;

    /**
     * @method writeImage
     * @description 将图片写入images文件夹中
     * @param {String} fileName 图片的文件名
     * @param {String} url 图片的地址
     */
    function writeImage(fileName, url) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'arraybuffer';
        xhr.open("GET", url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var uInt8Array = new Uint8Array(xhr.response);
                var fs = require('fs');
                var buf = new Buffer(xhr.response.byteLength);
                for (var i = 0; i < xhr.response.byteLength; ++i) {
                    buf.writeUInt8(uInt8Array[i], i);
                }
                fs.writeFile("./images/" + fileName, buf);
            }
        };
        xhr.send();
    };
    /**
     * @method log
     * @description 记录爬取日志，如果config是字符串类型，直接输出
     * @param {Object|String} config
     * @param {String} config.type 自行车类型
     * @param {String} config.subType 子类型
     * @param {String} config.bikeName 自行车名称
     * @param {String} config.bikeLink 自行车链接
     */
    function log(config) {
        var logTemplate = "<p>类型:{type} 子类型：{subType}自行车名称{bikeName} <a href='{bikeLink}'>自行车链接</a><p>";
        var log = logTemplate;

        if (typeof config === "string") {
            $("#detail-list").append("<p>" + config + "</p>");
        } else {
            $.each(config, function (key, value) {
                log = log.replace("{" + key + "}", value);
            });
            $("#detail-list").append(log);
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
    }

    /**
     * @method launchLink
     * @description 向某个网页发起链接
     * @param {String} url
     * @return {Promise}
     * done的回调函数接受一个参数为document;fail的回调函数接受三个参数为url ,status,xhr.response
     */
    function launchLink(url) {
        var defered = $.Deferred();
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'document';
        xhr.open("GET", url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    defered.resolve(xhr.response);
                } else {
                    defered.reject(url, xhr.status, xhr.response);
                    console.log("error---");
                    console.log(url);
                    console.log(xhr.status);
                }
            }
        };
        xhr.send();
        return defered.promise();
    }

    /**
     * @method judgeEndAndHandle
     * @description 判断爬取是否结束，并进行相应处理
     */
    function judgeEndAndHandle() {
        if (successedCount + failedCount === count) {
            log("爬取已结束，成功" + successedCount + "、失败" + failedCount);
        }
    }

    /**
     * @method spiderAllType
     * @description 获取所有的类型
     * @param url
     * @return {Promise}
     * done的回调函数接受一个参数 {Array} typeList 元素格式为
     * {
     *  url:""
     *  name:""
     *  }
     *  url为类型的链接，name为名称
     */
    function spiderAllType(url) {
        var defered = $.Deferred();
        launchLink(url).done(function (document) {
                //获得需要遍历的自行车类型
                var typeNodeList = document.querySelectorAll("#bikes-overlay ul.bike-tabs li a");
                var typeList = [];
                [].forEach.call(typeNodeList, function (a) {
                    typeList.push({
                        name: a.innerHTML,
                        url: a.getAttribute("href")
                    });
                });
                defered.resolve(typeList);
            }
        ).fail(function () {
                defered.reject();
            });
        return defered.promise();
    }

    /**
     * @method spiderBike
     * @description 爬取某条自行车数据
     * @param {String} typeName 自行车类型，取值 moutain、road等
     * @param {String} subTypeName 子类型
     * @param {String} url 自行车详情链接
     * @return {Promise}
     * done、fail接受一个参数url
     */
    function spiderBike(typeName, subTypeName, url) {
        var defered = $.Deferred();
        launchLink(url).done(function (document) {
            var bike = {
            };
            bike.name = document.querySelector(".bikeName").innerHTML;
            bike.type = typeName;
            bike.subType = subTypeName;
            bike.features = {

            };
            try {
                if (typeName == 'MOUNTAIN') {
                    //山地需单独爬取
                    bike.features.h1 = document.querySelector(".bikeFeatures .tab_uppr_left .tgc").innerHTML;
                    bike.features.h1_value = document.querySelector(".bikeFeatures .tab_uppr_left").childNodes[2].textContent;
                    bike.features.h2 = document.querySelector(".bikeFeatures .tab_uppr_left .tic").innerHTML;
                    bike.features.h2_value = (function () {
                        var h2Value = {

                        };
                        [].forEach.call(document.querySelectorAll(".bikeFeatures .tab_uppr_left li"), function (li, index) {
                            //console.log( li.innerHTML);
                            h2Value["value_" + index] = li.innerHTML;
                        });
                        return h2Value;
                    }());
                    bike.features.h3 = document.querySelector(".bikeFeatures .rider_profile .tic").innerHTML;
                    bike.features.h3_value = document.querySelector(".bikeFeatures .rider_profile").childNodes[2].textContent;
                } else if (typeName == 'ROAD') {
                    //公路
                    bike.features.h1 = document.querySelector(".bikeFeatures .tab_uppr_left h2").innerHTML;
                    if (document.querySelector(".bikeFeatures .tab_uppr_left").childNodes[5] != null) {
                        bike.features.h1_value = document.querySelector(".bikeFeatures .tab_uppr_left").childNodes[5].textContent;
                    } else {
                        bike.features.h1_value = document.querySelector(".bikeFeatures .tab_uppr_left").childNodes[2].textContent;
                    }
                    if (document.querySelector(".bikeFeatures .tab_uppr_left h3") != null) {
                        bike.features.h2 = document.querySelector(".bikeFeatures .tab_uppr_left h3").innerHTML;
                        bike.features.h2_value = (function () {
                            var h2Value = {

                            };
                            [].forEach.call(document.querySelectorAll(".bikeFeatures .tab_uppr_left li"), function (li, index) {
                                //console.log( li.innerHTML);
                                h2Value["value_" + index] = li.innerHTML;
                            });
                            return h2Value;
                        }());
                    }
                    bike.features.h3 = document.querySelector(".bikeFeatures .rider_profile .tgc").innerHTML;
                    if (document.querySelector(".bikeFeatures .rider_profile p") != null) {
                        bike.features.h3_value = document.querySelector(".bikeFeatures .rider_profile p").innerText;
                    } else {
                        document.querySelector(".bikeFeatures .rider_profile").childNodes[2].textContent;
                    }
                } else {
                    //其他
                }
            } catch (e) {
                console.log(bike.name);
                console.log(e);
            }
            bike.technology = {};
            bike.specifications = (function () {
                var specifications = {};
                [].forEach.call(document.querySelectorAll("#bike-specs .specItem"), function (specItem, index) {
                    specifications[specItem.querySelector("h5").innerHTML.replace(/\s+/g, "")] = specItem.querySelector("p").innerHTML;
                });
                return specifications;
            }());
            bike.picurl = (function () {
                var fileName = (bike.name + ".jpg").replace(/\s+/g, "");
                if (produceImage) {
                    writeImage(fileName, document.querySelector("#zoom-img-container img").getAttribute("src"));
                }
                return fileName;
            }());
            bike.geometry = "";
            bike.price = (function () {
                var price = {};
                price.usd = document.querySelector(".price-amount").innerHTML;
                return price;
            }());
            bike.time = new Date().toJSON();
            var fs = require('fs');
            fs.appendFile("./bikes.json", JSON.stringify(bike) + "\n");
            log({
                type: typeName,
                subType: subTypeName,
                bikeName: bike.name,
                bikeLink: url
            });
            defered.resolve(url);
        }).fail(function () {
            defered.reject(url);
        });
        return defered.promise();
    }

    function startSpieder() {
        /**
         * @method handleType
         * @description 爬取某一类型的数据
         * @param {Object} type
         * @param type.name 取值为moutain、road等
         * @param type.url 某一类型的链接
         */
        function handleType(type) {
            launchLink(type.url).done(function (document) {
                var subTypeList = document.querySelectorAll("#category-tab-contents ul.bikesSubCatMenu li a");
                [].forEach.call(subTypeList, function (a, index) {
                    var subTypeName = a.innerHTML;
                    var subTypeId = a.getAttribute("href");
                    var bikesList = document.querySelectorAll(subTypeId + " li a");
                    count += bikesList.length;
                    [].forEach.call(bikesList, function (a, index) {
                        //向每个自行车详情页发起链接，并进行处理
                        spiderBike(type.name, subTypeName, a.getAttribute("href")).done(function (url) {
                            successedCount++;
                            judgeEndAndHandle();
                        }).fail(function (url) {
                            failedCount++;
                            judgeEndAndHandle();
                            console.log("爬取失败<a href='" + url + "'>链接</a>");
                        });
                    });
                })
            });
        }

        spiderAllType("http://www.cannondale.com/nam_en/2015/bikes/mountain").done(function (typeList) {
            typeList.forEach(handleType);
        });
    }

    $("#start-spider").click(function () {
        if ($("[name=produceImage]:checked").val() == 1) {
            produceImage = true;
        } else {
            produceImage = false;
        }
        startSpieder();
    });
}())

