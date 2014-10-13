(function () {
    //爬的自行车总数
    var count = 0;
    //当前已爬的条数
    var currentCount = 0;

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

    }

    /**
     * @method launchLink
     * @description 向某个网页发起链接，并且在网页加载完毕后，执行callback。
     * 传递给callback1个参数 document对象
     * @param {String} url
     * @param {Function} callback
     */
    function launchLink(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'document';
        xhr.open("GET", url);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                callback(xhr.response);
            }
        };
        xhr.send();
    }

    $("#start-spider").click(function () {
        //向列表页面发起请求，获取到所有的自行车类型，并依此进行处理
        launchLink("http://www.cannondale.com/nam_en/2015/bikes/mountain", function (document) {
            var typeList = document.querySelectorAll("#bikes-overlay ul.bike-tabs li a");
            [].forEach.call(typeList, function (a, index) {
                var typeName = a.innerHTML;
                //对每个类型发起请求，并进行处理
                launchLink(a.getAttribute("href"), function (document) {
                    var subTypeList = document.querySelectorAll("#category-tab-contents ul.bikesSubCatMenu li a");
                    [].forEach.call(subTypeList, function (a, index) {
                        var subTypeName = a.innerHTML;
                        var subTypeId = a.getAttribute("href");
                        var bikesList = document.querySelectorAll(subTypeId + " li a");
                        count += bikesList.length;
                        [].forEach.call(bikesList, function (a, index) {
                            //向每个自行车详情页发起链接，并进行处理
                            launchLink(a.getAttribute("href"), function (document) {
                                    var bike = {
                                    };
                                    bike.name = document.querySelector(".bikeName").innerHTML;
                                    bike.type = typeName;
                                    bike.subType = subTypeName;
                                    bike.features = {

                                    };
                                    try {
                                        bike.features.h1 = document.querySelector(".bikeFeatures .tab_uppr_left .tgc").innerHTML;
                                        bike.features.h1_value = document.querySelector(".bikeFeatures .tab_uppr_left").childNodes[2].textContent;
                                        bike.features.h2 = document.querySelector(".bikeFeatures .tab_uppr_left .tic").innerHTML;
                                        bike.features.h2_value = (function () {
                                            var h2Value = {

                                            };
                                            [].forEach.call(document.querySelector(".bikeFeatures .tab_uppr_left li"), function (li, index) {
                                                h2Value["value_" + index] = li.innerHTML;
                                            });
                                            return h2Value;
                                        }());
                                        bike.features.h3 = document.querySelector(".bikeFeatures .rider_profile .tic").innerHTML;
                                        bike.features.h3_value = document.querySelector(".bikeFeatures .rider_profile").childNodes[2].textContent;
                                    } catch (e) {
                                        console.log(e);
                                    }
                                    bike.technology = "";
                                    bike.specifications = (function () {
                                        var specifications = {};
                                        [].forEach.call(document.querySelectorAll("#bike-specs .specItem"), function (specItem, index) {
                                            specifications[specItem.querySelector("h5").innerHTML.replace(/\s+/g, "")] = specItem.querySelector("p").innerHTML;
                                        });
                                        return specifications;
                                    }());
                                    bike.picurl = (function () {
                                        var fileName = (bike.name + ".jpg").replace(/\s+/g, "");
                                        writeImage(fileName, document.querySelector(".detailImage").getAttribute("src"));
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
                                        bikeLink: a.getAttribute("href")
                                    });
                                    currentCount++;
                                    if (count === currentCount) {
                                        log("爬取完毕，共爬取" + count + "条数据");
                                    }
                                }
                            );
                        });
                    })

                });
            });
        });
    });
}())

