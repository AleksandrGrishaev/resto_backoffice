Так мне надо сделать меню.

Какие есть сложности и ограничения, у меня есть 3 типа позиций в меню.

Я хочу создать составные завтраки с возможностьт выбирать ингредиенты, чтобы была база и человек выбрал, что он хочет добавить, безучловно у меня также будут примеры, то есть уже предзаготовленные выборы и основы, чтобы человек выбрал вот такой набор, но в итоге мог что-то там поменять (1-2 позиции или добавить). Также можно полностью собрать завтрак.

По поводу ужинов и стейков, человек тоже тожен иметь возможность выбрать гарнир, выбрать соус. Может попросить добавить еще один соус, например. Это тоже все делает из Composition меню.

Дальше еще должна быть возможность подключать к блюду группу addons, а не каждый раз добавлять их в ручном режиме.

довольно сложно, но мы можем с этим справиться. Наша задача составить правильно задачу.

Такие у меня есть проблемы:

1. В Dev и Prod базах разные данные по продуктам, полуфабрикатам и рецептам. В dev остались тестовые, в production уже реальные. Ты сейчас подключен к prodacction.

2. Я думаю разделить пока все блюда на simple, composition.

3. я не уверен реализован ли у нас функционал добавления группы addons к продукту. Если не реализован, то надо реализовывать в dev режиме и проверять. А потом интегрировать миграции в базу и код в продакшен, до внесения реального меню.

давай проанализируем и составим план действий и напишем его в nexttodo.md

# Dinner

## Tuna steak

price - 90000

## Chiken steak

price - 85000

## Beef steak

price 200gr - 125000
price 250gr - 150000
price 300gr - 160000

# Poke

## PokeSalmon

price - 90000

## PokeTuna

price - 80000

## SushiWrap

price - 95000

# Salad

## Greek

price - 75000

## Garden

price - 75000

# Soup

## TomYum

price - 80000

## Pumpking soup

price - 55000

# Pasta

## Bolognese pasta

price - 80000

## Carbonara pasta

price - 80000

# Dumplings

## Dumplings pork\beef

normal 14pc dumplings - 75000
large 25pc dumpligs - 95000

## Dumplings potato

price - 75000

# Ciabatta

## Moza ciabatta

price - 65000

## Salmon ciabatta

price - 85000

## Guacomole ciabatta

price - 54000

## Tuna ciabatta

price - 65000

# Sweet breakfast

## Syrniki

price - 70000
extra syrnik - 15000

## Fruit salad

price - 49000

## Granola Yuogurt

price - 49000

# Breakfast

## Croissant salmon

price - 75000

## Hasbrown burger

price - 85000

## Hasbrown egg

price - 75000

## Shakshuka

price - 65000

## Porridge

price -49000

# Toast

## SmashAvo toast

price - 65000

## Aus beef toast

price - 80000

# Custome breakfast

## Big breakfast

price - 85000

## Simple breakfast

price - 60000

# Pizza

## Quesadililia

price - 79000

# Smoothie

## Smoothie mango

price - 65000

## Smoothie papaya

price - 65000

## Smoothie dragon

price - 65000

## Smoothie choco-coco

price -60000

# Addons

## Breakfast

### Hasbrown potato

### ZukiniHashbrown

## Dinner

## Poke
