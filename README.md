# testcafe-allure-abanking  

Форк [testcafe-reporter-allure-plus](https://github.com/juanpablo-vasquez/testcafe-reporter-allure-plus), основанный на модификациях [Isaac's](https://github.com/isaaceindhoven/testcafe-reporter-allure).  

**Важно**: Эти модификации адаптированы под конкретный кейс и расширяют возможности для работы с Allure в TestCafé.  


## Документация  

Краткая инструкция по началу работы с данным репортером.  

### Установка  

Установите через npm:  

```sh
npm install --save-dev testcafe-allure-abanking
```  

### Конфигурация  

#### TestCafé  

Если вы запускаете тесты из командной строки, укажите имя репортера с помощью флага `--reporter`:  

```console
testcafe chrome 'path/to/test/file.js' --reporter allure-abanking
```  

Если вы используете API, передайте имя репортера в метод `reporter()`:  

```javascript
testCafe
    .createRunner()
    .src('path/to/test/file.js')
    .browsers('chrome')
    .reporter('allure-abanking') // <-  
    .run();
```  

Если вы используете файл конфигурации TestCafe, настройте атрибут `reporter`:  

```json
{
    ...
    "reporter": {
        "name": "allure-abanking"
    },
    ...
}
```  

#### Allure  

`testcafe-allure-abanking` предоставляет файл конфигурации `allure.config.js`, который можно переопределить в корневой директории вашего проекта.  

### Шаги  

С данным репортером можно определять шаги (`test-steps`), чтобы разделить тест на несколько этапов. Функция шага ожидает три параметра: название шага, `TestController` и действия внутри шага в виде `TestControllerPromise`.  

```typescript
import step from 'testcafe-allure-abanking/dist/utils';

test("Пример теста с шагами", async t => {
  await step("Добавить имя разработчика в форму", t, 
    t.typeText("#developer-name", "Иван Иванов")
  );
  await step("Отправить форму и проверить результат", t,
    t.click("#submit-button")
      .expect(Selector("#article-header").innerText)
      .eql("Спасибо, Иван Иванов!")
  );
});
```  

## Лицензия  

Этот проект распространяется под лицензией [MIT](https://github.com/juanpablo-vasquez/testcafe-reporter-allure-plus/blob/master/LICENSE), так как является форком оригинального репозитория.
