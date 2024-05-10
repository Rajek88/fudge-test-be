## Get started

clone the repo

```bash
  git clone https://github.com/Rajek88/fudge-test-be.git
```


## Installation

Install the necessary dependencies with yarn

```bash
  cd fudge-test-be
  yarn
```
    
## Setup DB

Setup the database. (The required schema is already generated and present inside the repo)

### for local db
```bash
  npx wrangler d1 migrations apply prod-d1-fudge --local
```
### for server db
```bash
  npx wrangler d1 migrations apply prod-d1-fudge --remote
```

## Start the server
```bash
  npm run dev
```