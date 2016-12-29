// ==UserScript==
// @name         Generic Change CFD Colours
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Change colours on TFS Cumulative Flow Diagrams
// @author       samelliz+cfd@gmail.com
// @match        https://*.visualstudio.com/*/_backlogs/board/Stories*
// @grant        none
// ==/UserScript==
 (function() {
    'use strict';

    var scores = {};

    var getColours = function( data, rowCount, columnCount ){
        var foundText = 0, foundGap = 0, foundKey = 0;
        var currentColumnIndex = columnCount - 1;

        do {
            if (foundText === 0) {
                if (!isColumnWhite(data, currentColumnIndex, rowCount, columnCount)) { foundText = currentColumnIndex; }
            } else if (foundGap === 0) {
                if (isColumnWhite(data, currentColumnIndex, rowCount, columnCount)) { foundGap = currentColumnIndex; }
            } else if (foundKey === 0){
                if (!isColumnWhite(data, currentColumnIndex, rowCount, columnCount)) { foundKey = currentColumnIndex; }
            }

            currentColumnIndex--;
        } while (currentColumnIndex > 0 && foundKey === 0);

        if (foundKey === 0)
        {
            console.log("Oops, could not find colours!");
            return;
        }

        var colours = [];
        for (var i = 0; i < rowCount; i++){
            var pixel = getColour(data, i, currentColumnIndex, columnCount);
            var hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
            if (hex !== '#ffffff' && colours.indexOf(hex) == -1) colours.push(hex);
        }

        return colours;
    };

    var isColumnWhite = function (data, columnIndex, rowCount, columnCount) {
        for (var i = 0; i < rowCount; i++){
           var pixel = getColour(data, i, columnIndex, columnCount);
            if (pixel[0] !== 255 && pixel[1] !== 255 && pixel[2] !== 255){
                return false;
            }
        }
        return true;
    };

    var getColour = function (data, row, column, columnCount){
        var redPosition = ((row * columnCount) + column) * 4;
        return new Uint8ClampedArray([data[redPosition], data[redPosition + 1], data[redPosition + 2], data[redPosition + 3]]);
    };

    var componentToHex = function (c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };

    var rgbToHex = function (r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    };

    var hexToRgb = function (hex) {

        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, function(m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? new Uint8ClampedArray([
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ]) : null;
    };

    var colourMatchScore = function (changed, find, tolerance, data, i, rowWidth){
        var score = 0;

        if (colourMatchExact(find, data, i)){
            score = 1;

            score += [i-1, i-rowWidth-1, i-rowWidth, i-rowWidth+1].reduce(function(acc, curr){
                return acc + colourMatch(changed, tolerance, data, curr);
            }, 0);

            score += [i+1, i+rowWidth-1, i+rowWidth, i+rowWidth+1].reduce(function(acc, curr){
                return acc + colourMatch(find, tolerance, data, curr);
            }, 0);

            scores[score + 100] = scores[score + 100] + 1 | 1;
        }
        else {
            if (!colourMatch(find, tolerance, data, i)){
                scores["No Match"] = scores["No Match"] + 1 | 1;
                return 0;
            }

            score += [i-1, i-rowWidth-1, i-rowWidth, i-rowWidth+1].reduce(function(acc, curr){
                return acc + colourMatchExact(changed, data, curr);
            }, 0);

            score += [i+1, i+rowWidth-1, i+rowWidth, i+rowWidth+1].reduce(function(acc, curr){
                return acc + colourMatchExact(find, data, curr);
            }, 0);

            scores[score] = scores[score] + 1 | 1;
        }

        return score;
    };

    var colourMatch = function (colour, tolerance, data, i){
        return colour[0] + tolerance >= data[i] && colour[0] - tolerance <= data[i] &&
               colour[1] + tolerance >= data[i+1] && colour[1] - tolerance <= data[i+1] &&
               colour[2] + tolerance >= data[i+2] && colour[2] - tolerance <= data[i+2] ;
    };

    var colourMatchExact = function (colour, data, i){
        return colour[0] === data[i] &&
               colour[1] === data[i+1] &&
               colour[2] === data[i+2];
    };

    var getNewColour = function(matchCol, newCol, data, i){

        var relativeBrightness = (parseFloat(data[i+2]) / parseFloat(matchCol[2]));

        return new Uint8ClampedArray([
            parseFloat(newCol[0]) * relativeBrightness,
            parseFloat(newCol[1]) * relativeBrightness,
            parseFloat(newCol[2]) * relativeBrightness
        ]);
    };

    var process = function(img, $container){

        var canvas = $("<canvas style='position: absolute; top:0; left:0; hidden: true'></canvas>").get(0);
        $('.large-chart-container').append(canvas);
        var context = canvas.getContext('2d');
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
        $container.width(img.clientWidth);
        $container.height(img.clientHeight);
        context.drawImage(img, 0, 0);

        var frame = context.getImageData(0, 0, canvas.width, canvas.height);
        var length = frame.data.length;

        var colours = getColours(frame.data, canvas.height, canvas.width).map(hexToRgb);
        var newColours = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"].map(hexToRgb);
            var tolerance = 100;

        for (var i = 0; i < length; i += 4) {
            for (var j = 0; j < colours.length; j++){
                    if (colourMatchScore(newColours[j], colours[j], tolerance, frame.data, i, canvas.width * 4) > 1){
                    var replaceColour = getNewColour(colours[j], newColours[j], frame.data, i);
                    frame.data[i] = replaceColour[0];
                    frame.data[i+1] = replaceColour[1];
                    frame.data[i+2] = replaceColour[2];
                }
            }
        }

        context.putImageData(frame, 0, 0);

        $container.removeClass('in-progress-container');
        console.log('finished');
        console.log('score on the door', scores);
    };

    var changeColours = function(){

        console.log("start");

        var img = $(".large-chart-container img").get(0);
        $(img).css('hidden', 'true');

        if (img == 'undefined'){
            alert('Sorry, could not find CFD image.');
            return;
        }

        $('.large-chart-container img').css('visibility', 'hidden');

        var $container =  $('.large-chart-container');
        $container.addClass('in-progress-container');

        window.setTimeout(process(img, $container), 1);
    };

    $('body').on('dblclick', '.large-chart-container img', changeColours);

})();