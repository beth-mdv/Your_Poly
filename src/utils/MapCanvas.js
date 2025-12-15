import React, { useRef, useEffect, useState } from 'react';

const REF_SIZE = { 
    1: { w: 2000, h: 1500 }, 
    2: { w: 2000, h: 1500 }
};

const STYLE = {
    lineWidth: 5,
    outlineWidth: 8,
    color: '#2563eb',
    startColor: '#16a34a',
    endColor: '#dc2626',
    durationMs: 2000
};

const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const MapCanvas = ({ floor, mapImageSrc, pathNodes, isActiveAnimation }) => {
    const canvasRef = useRef(null);
    const [imageObj, setImageObj] = useState(null);
    const [parentSize, setParentSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const img = new Image();
        img.src = mapImageSrc;
        img.onload = () => setImageObj(img);
        img.onerror = () => console.error("MapCanvas: Image load failed", mapImageSrc);
    }, [mapImageSrc]);

    useEffect(() => {
        const updateSize = () => {
            if (canvasRef.current && canvasRef.current.parentElement) {
                const { clientWidth, clientHeight } = canvasRef.current.parentElement;
                setParentSize({ w: clientWidth, h: clientHeight });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !imageObj || parentSize.w === 0) return;

        canvas.width = parentSize.w;
        canvas.height = parentSize.h;

        const refW = REF_SIZE[floor]?.w || 2000;
        const refH = REF_SIZE[floor]?.h || 1500;
        const scale = Math.min(canvas.width / refW, canvas.height / refH);
        const offsetX = (canvas.width - refW * scale) / 2;
        const offsetY = (canvas.height - refH * scale) / 2;

        const points = (pathNodes || []).map(node => ({
            x: node.x * scale + offsetX,
            y: node.y * scale + offsetY
        }));

        let totalLen = 0;
        const lengths = [0];
        for (let i = 0; i < points.length - 1; i++) {
            const dist = Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
            totalLen += dist;
            lengths.push(totalLen);
        }

        const drawFrame = (currentLen) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height, offsetX, offsetY, refW * scale, refH * scale);

            if (points.length < 2) return;

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const drawPath = (width, color) => {
                ctx.lineWidth = width;
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);

                for (let i = 0; i < points.length - 1; i++) {
                    const segLen = lengths[i+1] - lengths[i];
                    const startLen = lengths[i];
                    
                    if (currentLen <= startLen) break;

                    if (currentLen >= lengths[i+1]) {
                        ctx.lineTo(points[i+1].x, points[i+1].y);
                    } else {
                        const progress = (currentLen - startLen) / segLen;
                        const newX = points[i].x + (points[i+1].x - points[i].x) * progress;
                        const newY = points[i].y + (points[i+1].y - points[i].y) * progress;
                        ctx.lineTo(newX, newY);
                        break;
                    }
                }
                ctx.stroke();
            };

            drawPath(8, 'white');
            drawPath(5, STYLE.color);

            drawDot(ctx, points[0], STYLE.startColor);

            if (currentLen >= totalLen) {
                drawDot(ctx, points[points.length-1], STYLE.endColor);
            }
        };

        const drawDot = (ctx, pt, color) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        };

        let reqId;
        let startTime;

        const animate = (time) => {
            if (!startTime) startTime = time;
            const elapsed = time - startTime;
            const progress = Math.min(1, elapsed / STYLE.durationMs);
            const easedLen = totalLen * easeIO(progress);

            drawFrame(easedLen);

            if (progress < 1) {
                reqId = requestAnimationFrame(animate);
            } else {
                drawFrame(totalLen);
            }
        };

        if (isActiveAnimation && points.length > 0) {
            reqId = requestAnimationFrame(animate);
        } else {
            drawFrame(totalLen);
        }

        return () => cancelAnimationFrame(reqId);

    }, [imageObj, parentSize, pathNodes, floor, isActiveAnimation]);

    return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />;
};

export default MapCanvas;