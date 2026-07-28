# YURIM AI COMPANY · Pixel Office

사규에 정의된 11개 부서, 직원 31명, 사람 대표 1명과 하루 12단계 파이프라인을 보여주는 정적 웹 콘솔입니다.

## 포함된 기능

- 부서별 방 11개, 대표실, 회의실, 라운지, 출입구
- 직원 수와 일치하는 책상·의자 자리
- 벽과 가구 충돌 처리
- 다른 직원을 동적 장애물로 취급하는 A* 경로 탐색
- 완료·진행 중·승인 대기·연동 대기·대기 5종 상태
- 걷기·타이핑·대화·앉기 픽셀 애니메이션
- 도메인 지정, 단계 진행, 회의 소집, 집중 모드, 대표 승인 콘솔
- 사규의 대표 지시문을 인식하는 로컬 명령창

현재 콘솔은 브라우저 안에서 동작하는 시뮬레이션입니다. 실제 AI 작업을 연결할 때는 API 키를 브라우저 코드에 넣지 말고 별도 서버 또는 GitHub Actions의 Secret을 사용해야 합니다.

## 로컬에서 보기

`web` 폴더를 정적 웹 서버로 열면 됩니다.

```bash
cd web
python3 -m http.server 4173
```

브라우저에서 `http://localhost:4173`을 엽니다.

## GitHub Pages 배포

새 GitHub 저장소를 만든 뒤 이 폴더에서 아래 순서로 연결합니다.

```bash
git init
git add .
git commit -m "Build YURIM pixel office console"
git branch -M main
git remote add origin <새 저장소 주소>
git push -u origin main
```

저장소의 **Settings → Pages → Build and deployment → Source**를 `GitHub Actions`로 선택합니다. 이후 `main` 브랜치에 push하면 `.github/workflows/pages.yml`이 `web` 폴더를 자동 배포합니다.
