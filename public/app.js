document.getElementById('searchButton').addEventListener('click', () => {
    const query = document.getElementById('searchBox').value;
    fetch(`/search?query=${query}`)
        .then(response => response.json())
        .then(articles => {
            const articlesDiv = document.getElementById('articles');
            articlesDiv.innerHTML = articles.map(article => `<div><h3>${article.title}</h3><p>${article.description}</p><a href="/article.html?id=${article.id}">Читать</a></div>`).join('');
        });
});

window.addEventListener('load', () => {
    fetch('/articles')
        .then(response => response.json())
        .then(articles => {
            const articlesDiv = document.getElementById('articles');
            articlesDiv.innerHTML = articles.map(article => `<div><h3>${article.title}</h3><p>${article.description}</p><a href="/article.html?id=${article.id}">Читать</a></div>`).join('');
        });
});
