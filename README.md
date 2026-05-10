# EmailAssist Download Page

EmailAssist 서비스 소개와 데스크톱 응용프로그램 다운로드를 위한 별도 정적 페이지입니다.

## Vercel 배포 설정

- Root Directory: `Download_Page`
- Framework Preset: `Other`
- Build Command: 비워 둠
- Output Directory: `.`

페이지는 `config.js`의 `releaseRepository` 값을 사용해 GitHub Releases API에서 최신 릴리스를 직접 조회합니다. `App_Front` 저장소에 새 `v*` 태그 릴리스가 생성되면 Vercel 재배포 없이도 Windows, macOS 다운로드 목록이 최신 버전으로 갱신됩니다.
