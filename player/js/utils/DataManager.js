function dataFunctionManager(){

    //var tSpanHelper = document.createElementNS(svgNS,'text');
    var tCanvasHelper = document.createElement('canvas').getContext('2d');

    function completeLayers(layers, comps, fontManager){
        var layerData;
        var animArray, lastFrame;
        var i, len = layers.length;
        var j, jLen, k, kLen;
        for(i=0;i<len;i+=1){
            layerData = layers[i];
            if(!('ks' in layerData) || layerData.completed){
                continue;
            }
            layerData.completed = true;
            if(layerData.tt){
                layers[i-1].td = layerData.tt;
            }
            animArray = [];
            lastFrame = -1;
            if(layerData.hasMask){
                var maskProps = layerData.masksProperties;
                jLen = maskProps.length;
                for(j=0;j<jLen;j+=1){
                    if(maskProps[j].pt.i){
                        convertPathsToAbsoluteValues(maskProps[j].pt);
                    }else{
                        kLen = maskProps[j].pt.length;
                        for(k=0;k<kLen;k+=1){
                            if(maskProps[j].pt[k].s){
                                convertPathsToAbsoluteValues(maskProps[j].pt[k].s[0]);
                            }
                            if(maskProps[j].pt[k].e){
                                convertPathsToAbsoluteValues(maskProps[j].pt[k].e[0]);
                            }
                        }
                    }
                }
            }
            if(layerData.ty===0){
                layerData.layers = findCompLayers(layerData.refId, comps);
                completeLayers(layerData.layers, comps, fontManager);
            }else if(layerData.ty === 4){
                completeShapes(layerData.shapes);
            }else if(layerData.ty == 5){
                completeText(layerData, fontManager);
            }
        }
    }

    function findCompLayers(id,comps){
        var i = 0, len = comps.length;
        while(i<len){
            if(comps[i].id === id){
                return JSON.parse(JSON.stringify(comps[i].layers));
            }
            i += 1;
        }
    }

    function completeShapes(arr,trimmedFlag){
        var i, len = arr.length;
        var j, jLen;
        var isTrimmed = trimmedFlag ? trimmedFlag : false;
        for(i=len-1;i>=0;i-=1){
            if(arr[i].ty == 'tm'){
                isTrimmed = true;
            }
            if(arr[i].ty == 'sh'){
                arr[i].trimmed = isTrimmed;
                if(arr[i].ks.i){
                    convertPathsToAbsoluteValues(arr[i].ks);
                }else{
                    jLen = arr[i].ks.length;
                    for(j=0;j<jLen;j+=1){
                        if(arr[i].ks[j].s){
                            convertPathsToAbsoluteValues(arr[i].ks[j].s[0]);
                        }
                        if(arr[i].ks[j].e){
                            convertPathsToAbsoluteValues(arr[i].ks[j].e[0]);
                        }
                    }
                }
            }else if(arr[i].ty == 'gr'){
                completeShapes(arr[i].it,isTrimmed);
            }
        }
    }

    function convertPathsToAbsoluteValues(path){
        var i, len = path.i.length;
        for(i=0;i<len;i+=1){
            path.i[i][0] += path.v[i][0];
            path.i[i][1] += path.v[i][1];
            path.o[i][0] += path.v[i][0];
            path.o[i][1] += path.v[i][1];
        }
    }

    function completeData(animationData, fontManager){
        completeLayers(animationData.layers, animationData.assets, fontManager);
    }

    function completeText(data, fontManager){
        var letters = [];
        var documentData = data.t.d;
        var i, len;
        var newLineFlag, index = 0, val;
        var anchorGrouping = data.t.m.g;
        var currentSize = 0, currentPos = 0, currentLine = 0, lineWidths = [];
        var lineWidth = 0;
        var maxLineWidth = 0;
        var j, jLen;
        var fontData = fontManager.getFontByName(documentData.f);
        var charData, cLength;
        var styles = fontData.fStyle.split(' ');

        var fWeight = 'normal', fStyle = 'normal';
        len = styles.length;
        for(i=0;i<len;i+=1){
            if (styles[i].toLowerCase() === 'italic') {
                fStyle = 'italic';
            }else if (styles[i].toLowerCase() === 'bold') {
                fWeight = '700';
            } else if (styles[i].toLowerCase() === 'black') {
                fWeight = '900';
            } else if (styles[i].toLowerCase() === 'medium') {
                fWeight = '500';
            } else if (styles[i].toLowerCase() === 'regular' || styles[i].toLowerCase() === 'normal') {
                fWeight = '400';
            } else if (styles[i].toLowerCase() === 'light' || styles[i].toLowerCase() === 'thin') {
                fWeight = '200';
            }
        }
        documentData.fWeight = fWeight;
        documentData.fStyle = fStyle;
        len = documentData.t.length;
        for (i = 0;i < len ;i += 1) {
            newLineFlag = false;
            if(documentData.t.charAt(i) === ' '){
                val = '\u00A0';
            }else if(documentData.t.charCodeAt(i) === 13){
                lineWidths.push(lineWidth);
                maxLineWidth = lineWidth > maxLineWidth ? lineWidth : maxLineWidth;
                lineWidth = 0;
                val = '';
                newLineFlag = true;
                currentLine += 1;
            }else{
                val = documentData.t.charAt(i);
            }
            if(fontManager.chars){
                charData = fontManager.getCharData(documentData.t.charAt(i), fontData.fStyle, fontManager.getFontByName(documentData.f).fFamily);
                cLength = newLineFlag ? 0 : charData.w*documentData.s/100;
            }else{
                tCanvasHelper.font = documentData.s + 'px '+ fontManager.getFontByName(documentData.f).fFamily;
                cLength = tCanvasHelper.measureText(val).width;
            }
            //
            lineWidth += cLength;
            letters.push({l:cLength,an:cLength,add:currentSize,n:newLineFlag, anIndexes:[], val: val, line: currentLine});
            if(anchorGrouping == 2){
                currentSize += cLength;
                if(val == '' || val == '\u00A0' || i == len - 1){
                    if(val == '' || val == '\u00A0'){
                        currentSize -= cLength;
                    }
                    while(currentPos<=i){
                        letters[currentPos].an = currentSize;
                        letters[currentPos].ind = index;
                        letters[currentPos].extra = cLength;
                        currentPos += 1;
                    }
                    index += 1;
                    currentSize = 0;
                }
            }else if(anchorGrouping == 3){
                currentSize += cLength;
                if(val == '' || i == len - 1){
                    if(val == ''){
                        currentSize -= cLength;
                    }
                    while(currentPos<=i){
                        letters[currentPos].an = currentSize;
                        letters[currentPos].ind = index;
                        letters[currentPos].extra = cLength;
                        currentPos += 1;
                    }
                    currentSize = 0;
                    index += 1;
                }
            }else{
                letters[index].ind = index;
                letters[index].extra = 0;
                index += 1;
            }
        }
        documentData.l = letters;
        maxLineWidth = lineWidth > maxLineWidth ? lineWidth : maxLineWidth;
        lineWidths.push(lineWidth);
        documentData.boxWidth = maxLineWidth;
        documentData.lineWidths = lineWidths;
        switch(documentData.j){
            case 1:
                data.t.d.justifyOffset = - documentData.boxWidth;
                break;
            case 2:
                data.t.d.justifyOffset = - documentData.boxWidth/2;
                break;
            default:
                data.t.d.justifyOffset = 0;
        }

        var animators = data.t.a;
        jLen = animators.length;
        var based, ind, indexes = [];
        for(j=0;j<jLen;j+=1){
            if(animators[j].a.sc){
                documentData.strokeColorAnim = true;
            }
            if(animators[j].a.sw){
                documentData.strokeWidthAnim = true;
            }
            if(animators[j].a.fc){
                documentData.fillColorAnim = true;
            }
            ind = 0;
            based = animators[j].s.b;
            for(i=0;i<len;i+=1){
                letters[i].anIndexes[j] = ind;
                if((based == 1 && letters[i].val != '') || (based == 2 && letters[i].val != '' && letters[i].val != '\u00A0') || (based == 3 && (letters[i].n || letters[i].val == '\u00A0' || i == len - 1)) || (based == 4 && (letters[i].n || i == len - 1))){
                    if(animators[j].s.rn === 1){
                        indexes.push(ind);
                    }
                    ind += 1;
                }
            }
            data.t.a[j].totalChars = ind;
            var currentInd = -1, newInd;
            if(animators[j].s.rn === 1){
                for(i = 0; i < len; i += 1){
                    if(currentInd != letters[i].anIndexes[j]){
                        currentInd = letters[i].anIndexes[j];
                        newInd = indexes.splice(Math.floor(Math.random()*indexes.length),1)[0];
                    }
                    letters[i].anIndexes[j] = newInd;
                }
            }
        }
        if(jLen === 0 && !('m' in data.t.p)){
            data.singleShape = true;
        }
        documentData.yOffset = documentData.s*1.2;
    }

















    function iterateText(item,offsettedFrameNum,renderType){
        var renderedData = item.renderedData[offsettedFrameNum];
        renderedData.t = {
        };
        if(item.t.p && 'm' in item.t.p) {
            renderedData.t.p = [];
            getInterpolatedValue(item.t.p.f,offsettedFrameNum, item.st,renderedData.t.p,0,1);
        }
        renderedData.t.m = {
            a: getInterpolatedValue(item.t.m.a,offsettedFrameNum, item.st)
        };
    }

    var moduleOb = {};
    moduleOb.completeData = completeData;

    return moduleOb;
}

var dataManager = dataFunctionManager();