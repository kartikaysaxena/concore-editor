import { saveAs } from 'file-saver';
import { NodeStyle, EdgeStyle } from '../config/defaultStyles';
import { actionType as T } from '../reducer';

class CoreGraph {
    getById(x) {
        return this.cy.getElementById(x);
    }

    addTestData() { return this; }

    setCy(cy) {
        this.cy = cy;
        window.cyx = cy;
        const selectDeselect = () => {
            const els = this.cy.$(':selected');
            if (els.length === 0) { return this.dispatcher({ type: T.ELE_UNSELECTED }); }
            let type;
            if (els.every((e) => e.isNode())) type = 'NODE';
            else if (els.every((e) => e.isEdge())) type = 'EDGE';
            else type = 'MIX';
            const ids = els.map((e) => e.data('id'));
            return this.dispatcher({
                type: T.ELE_SELECTED,
                payload: {
                    ids, type,
                },
            });
        };
        this.cy.on('select', selectDeselect);
        this.cy.on('unselect', selectDeselect);
        this.cy.on('zoom', (e) => {
            this.dispatcher({ type: T.SET_ZOOM, payload: Math.round(100 * e.target.zoom()) });
        });
        this.cy.on('nodeediting.resizeend', (e, type, node) => {
            if (node.scratch('automove')) {
                node.scratch('automove').forEach((x) => {
                    x.apply();
                });
            }
        });
    }

    setDispatcher(dispatcher) {
        this.dispatcher = dispatcher;
    }

    getPos() {
        const start = { x: 100, y: 100 };
        let found = true;
        while (found) {
            found = false;
            const nodes = this.cy.$('node');
            for (let i = 0; i < nodes.length; i += 1) {
                const nodePos = nodes[i].position();
                found = found || (nodePos.x === start.x && nodePos.y === start.y);
            }
            if (found) {
                start.x += 10;
                start.y += 10;
            }
        }
        return start;
    }

    addNode(label, style, type = 'ordin', position = this.getPos(), data = {}) {
        return this.cy.add({
            group: 'nodes',
            data: {
                label, type, ...data,
            },
            style,
            position,
        });
    }

    addEdge(source, target, label, style = {}, type = 'ordin') {
        return this.cy.add({
            group: 'edges',
            data: {
                source, target, label, type,
            },
            style,
        });
    }

    getStyle(id) {
        const el = this.getById(id);
        const allStyles = el.style();
        const styles = {};
        if (el.isNode) Object.entries(NodeStyle).forEach((p) => { styles[p[0]] = allStyles[p[0]]; });
        if (el.isEdge) Object.entries(EdgeStyle).forEach((p) => { styles[p[0]] = allStyles[p[0]]; });
        return styles;
    }

    getLabel(id) {
        return this.getById(id).data('label') || this.getById(id).data('label');
    }

    updateNode(id, style, label, shouldUpdateLabel) {
        if (shouldUpdateLabel) this.getById(id).data('label', label);
        this.getById(id).style(style);
    }

    updateEdge(id, style, label, shouldUpdateLabel) {
        if (shouldUpdateLabel) this.getById(id).data('label', label);
        this.getById(id).style(style);
    }

    updateData(id, key, val) {
        this.getById(id).data(key, val);
        return this;
    }

    modifyNewEdge() { return this; }

    enableDraw(enable) {
        if (enable) window.cye.enable();
        else window.cye.disable();
        return this;
    }

    deleteNode(id) {
        const el = this.getById(id);
        el.connectedEdges().forEach((edge) => this.deleteEdge(edge.id()));
        el.remove();
    }

    deleteEdge(id) {
        this.getById(id).remove();
    }

    deleteElem(id) {
        if (this.getById(id).isNode()) return this.deleteNode(id);
        return this.deleteEdge(id);
    }

    resetZoom() {
        this.cy.reset();
    }

    fitZoom() {
        this.cy.fit();
    }

    setZoom(v) {
        this.cy.zoom(v / 100);
    }

    downloadImg(format) {
        if (format === 'PNG') saveAs(this.cy.png(), 'graph.png');
        if (format === 'JPG') saveAs(this.cy.jpg(), 'graph.jpg');
    }

    shouldNodeBeSaved(nodeID) {
        return this.getById(nodeID).data('type') === 'ordin';
    }

    shouldEdgeBeSaved(edgeID) {
        return this.getById(edgeID).data('type') === 'ordin';
    }

    static getRealSourceId(nodeID) {
        return nodeID;
    }

    jsonifyGraph() {
        const graph = { nodes: [], edges: [] };
        this.cy.nodes().forEach((node) => {
            if (this.shouldNodeBeSaved(node.id())) {
                const nodeJson = node.json();
                nodeJson.style = this.getStyle(node.id());
                graph.nodes.push(nodeJson);
            }
        });
        this.cy.edges().forEach((edge) => {
            if (this.shouldEdgeBeSaved(edge.id())) {
                const edgeJson = edge.json();
                edgeJson.style = this.getStyle(edge.id());
                edgeJson.data.source = this.getRealSourceId(edge.source().id());
                graph.edges.push(edgeJson);
            }
        });
        return graph;
    }

    saveToDisk() {
        const str = JSON.stringify(this.jsonifyGraph());
        const bytes = new TextEncoder().encode(str);
        const blob = new Blob([bytes], {
            type: 'application/json;charset=utf-8',
        });
        saveAs(blob, 'graph.json');
    }

    loadJson(content) {
        this.cy.elements().remove();
        content.nodes.forEach((node) => {
            this.addNode(node.data.label, node.style, 'ordin', node.position, node.data);
        });
        content.edges.forEach((edge) => {
            this.addEdge(edge.data.source, edge.data.target, edge.data.label, edge.style);
        });
    }
}

export default CoreGraph;
