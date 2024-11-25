# release.sh
#!/bin/bash

message="$1"
if [ -z "$message" ]
then
    echo "Error: Commit message is required"
    echo "Usage: pnpm release \"your commit message\""
    exit 1
fi

# Проверяем и настраиваем upstream если нужно
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ -z "$(git config branch.$BRANCH.remote)" ]; then
    git push --set-upstream origin $BRANCH
fi

# Выполняем релиз только один раз
git add .
git commit -m "$message"
pnpm version patch -m "chore(release): %s - $message"
git push && git push --tags