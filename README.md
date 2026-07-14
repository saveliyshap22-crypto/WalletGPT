# WalletGPT for Android

WalletGPT — независимый Android-интерфейс для просмотра TON-портфеля с подключением Tonkeeper через официальный протокол TON Connect v2.

## Возможности

- безопасное подключение: ключи и подтверждение остаются в Tonkeeper;
- публичные балансы TON и Jettons через TON API;
- отдельный Sandbox-портфель с произвольными виртуальными активами;
- локальное хранение демо-портфеля;
- Android 8.0+ (API 26), Kotlin и WebViewAssetLoader;
- автоматическая сборка устанавливаемого beta APK в GitHub Actions.

## Важное разделение режимов

Настоящий режим читает только публичные данные подключённого адреса. Sandbox всегда помечен как `DEMO`; его суммы не существуют в блокчейне, не могут быть потрачены и не смешиваются с настоящим балансом.

WalletGPT не запрашивает seed-фразу и не содержит функций подписи или отправки транзакций. Проект не связан с Tonkeeper и использует собственные название и значок.

## Сборка

Требования: JDK 17, Android SDK 35 и Gradle 8.9.

```bash
gradle assembleDebug
```

APK появится в `app/build/outputs/apk/debug/app-debug.apk`.

## Используемые открытые интерфейсы

- [TON Connect](https://docs.ton.org/applications/ton-connect/overview)
- [TON API](https://docs.tonconsole.com/tonapi/rest-api)
- [Tonkeeper](https://tonkeeper.com/) как подключаемый внешний кошелёк

## Лицензия

MIT. Названия и товарные знаки третьих лиц принадлежат их владельцам.
