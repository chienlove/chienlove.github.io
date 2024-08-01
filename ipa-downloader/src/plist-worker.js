const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">';

export function parse(str) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(str, "text/xml");
    return parseNode(xmlDoc.documentElement.firstChild);
}

function parseNode(node) {
    switch (node.nodeName) {
        case 'dict':
            return parseDict(node);
        case 'array':
            return parseArray(node);
        case 'string':
            return node.textContent;
        case 'integer':
            return parseInt(node.textContent, 10);
        case 'real':
            return parseFloat(node.textContent);
        case 'true':
            return true;
        case 'false':
            return false;
        case 'date':
            return new Date(node.textContent);
        case 'data':
            return atob(node.textContent);
        default:
            console.warn('Unhandled node type:', node.nodeName);
            return null;
    }
}

function parseDict(node) {
    const dict = {};
    let key = null;
    for (let child of node.childNodes) {
        if (child.nodeName === 'key') {
            key = child.textContent;
        } else if (key) {
            dict[key] = parseNode(child);
            key = null;
        }
    }
    return dict;
}

function parseArray(node) {
    return Array.from(node.childNodes).map(parseNode).filter(x => x !== null);
}

export function build(obj) {
    const xmlDoc = new DOMParser().parseFromString(xmlHeader + '<plist version="1.0"></plist>', 'text/xml');
    const plist = xmlDoc.documentElement;
    plist.appendChild(buildNode(obj, xmlDoc));
    return new XMLSerializer().serializeToString(xmlDoc);
}

function buildNode(obj, xmlDoc) {
    if (typeof obj === 'string') {
        const node = xmlDoc.createElement('string');
        node.textContent = obj;
        return node;
    } else if (typeof obj === 'number') {
        const node = xmlDoc.createElement(Number.isInteger(obj) ? 'integer' : 'real');
        node.textContent = obj.toString();
        return node;
    } else if (typeof obj === 'boolean') {
        return xmlDoc.createElement(obj ? 'true' : 'false');
    } else if (obj instanceof Date) {
        const node = xmlDoc.createElement('date');
        node.textContent = obj.toISOString();
        return node;
    } else if (Array.isArray(obj)) {
        const node = xmlDoc.createElement('array');
        obj.forEach(item => node.appendChild(buildNode(item, xmlDoc)));
        return node;
    } else if (typeof obj === 'object') {
        const node = xmlDoc.createElement('dict');
        for (let [key, value] of Object.entries(obj)) {
            const keyNode = xmlDoc.createElement('key');
            keyNode.textContent = key;
            node.appendChild(keyNode);
            node.appendChild(buildNode(value, xmlDoc));
        }
        return node;
    }
    console.warn('Unhandled type:', typeof obj);
    return null;
}