class HanoiTower {
    constructor() {
        this.TOTAL_DISKS = 15;
        this.MOVE_DELAY = 2000;
        this.towers = [[], [], []];
        this.moveCount = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.minMoves = Math.pow(2, this.TOTAL_DISKS) - 1;

        // DOM要素
        this.moveCountElement = document.getElementById('moveCount');
        this.minMovesElement = document.getElementById('minMoves');
        this.startButton = document.getElementById('startButton');
        this.pauseButton = document.getElementById('pauseButton');
        this.towerElements = [
            document.getElementById('tower0'),
            document.getElementById('tower1'),
            document.getElementById('tower2')
        ];

        // 音声
        this.bgm = new Audio('bgm.mp3');
        this.bgm.loop = true;
        this.moveSound = new Audio('move.mp3');

        // イベントリスナー
        this.startButton.addEventListener('click', () => this.startSolving());
        this.pauseButton.addEventListener('click', () => this.togglePause());
        document.getElementById('volumeSlider').addEventListener('input', (e) => this.setVolume(e.target.value));

        // 初期化
        this.initializeTowers();
        this.updateMoveCount();
        this.updateButtons();
    }

    updateButtons() {
        this.startButton.disabled = this.isPlaying;
        this.pauseButton.disabled = !this.isPlaying;

        if (this.isPlaying) {
            this.startButton.textContent = '実行中';
            this.pauseButton.textContent = this.isPaused ? '再開' : '一時停止';
        } else {
            this.startButton.textContent = '開始';
            this.pauseButton.textContent = '一時停止';
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        this.updateButtons();

        // BGMの制御
        if (this.isPaused) {
            this.bgm.pause();
        } else {
            this.bgm.play();
        }
    }

    updateMoveCount() {
        this.moveCountElement.textContent = `${this.moveCount}`;
        this.minMovesElement.textContent = `${this.minMoves}`;
    }

    initializeTowers() {
        this.towers = [[], [], []];
        this.moveCount = 0;
        this.updateMoveCount();

        for (let i = this.TOTAL_DISKS; i > 0; i--) {
            this.towers[0].push(i);
        }
        this.renderTowers();
    }

    async moveDisk(from, to) {
        while (this.isPaused) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const disk = this.towers[from].pop();
        const diskElement = document.querySelector(`#tower${from} .disk[data-size="${disk}"]`);
        const fromTower = this.towerElements[from];
        const toTower = this.towerElements[to];
        const fromRect = fromTower.getBoundingClientRect();
        const toRect = toTower.getBoundingClientRect();

        if (diskElement) {
            // アニメーションのための位置計算
            const moveX = toRect.left - fromRect.left;
            const moveY = -150; // 上昇高度

            // アニメーションクラスと位置を設定
            diskElement.style.transform = `translate(0, 0)`;
            diskElement.classList.add('moving');

            // 上昇
            await this.animate(diskElement, [
                { transform: 'translate(0, 0)' },
                { transform: `translate(0, ${moveY}px)` }
            ], 400);

            // 水平移動
            await this.animate(diskElement, [
                { transform: `translate(0, ${moveY}px)` },
                { transform: `translate(${moveX}px, ${moveY}px)` }
            ], 600);

            // 下降
            await this.animate(diskElement, [
                { transform: `translate(${moveX}px, ${moveY}px)` },
                { transform: `translate(${moveX}px, 0)` }
            ], 400);
        }

        this.towers[to].push(disk);
        this.moveCount++;
        this.updateMoveCount();
        this.moveSound.currentTime = 0;
        this.moveSound.play();

        this.renderTowers();
        await new Promise(resolve => setTimeout(resolve, this.MOVE_DELAY - 1400)); // アニメーション時間を考慮
    }

    async animate(element, keyframes, duration) {
        const animation = element.animate(keyframes, {
            duration: duration,
            easing: 'ease-in-out',
            fill: 'forwards'
        });
        return animation.finished;
    }

    async startSolving() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.isPaused = false;
        this.updateButtons();

        this.initializeTowers();
        this.bgm.currentTime = 0;
        this.bgm.play();

        try {
            await this.solveHanoi(this.TOTAL_DISKS, 0, 1, 2);
        } catch (error) {
            console.error('Solving interrupted:', error);
        }

        this.isPlaying = false;
        this.isPaused = false;
        this.updateButtons();
        this.bgm.pause();
    }

    async solveHanoi(n, source, auxiliary, target) {
        if (n === 1) {
            await this.moveDisk(source, target);
            return;
        }
        await this.solveHanoi(n - 1, source, target, auxiliary);
        await this.moveDisk(source, target);
        await this.solveHanoi(n - 1, auxiliary, source, target);
    }

    renderTowers() {
        this.towerElements.forEach((tower, index) => {
            tower.innerHTML = '';
            this.towers[index].forEach(diskSize => {
                const disk = document.createElement('div');
                disk.className = 'disk';
                disk.setAttribute('data-size', diskSize);
                const width = Math.max(20, (diskSize / this.TOTAL_DISKS) * 95);
                disk.style.width = `${width}%`;
                tower.appendChild(disk);
            });
        });
    }

    setVolume(value) {
        this.bgm.volume = value;
        this.moveSound.volume = value;
    }
}

// アプリケーションの初期化
window.addEventListener('DOMContentLoaded', () => {
    new HanoiTower();
}); 