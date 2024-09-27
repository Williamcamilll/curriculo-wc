// Rolagem suave para navegação
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Voltar ao topo com animação e fade in/out
const backToTopButton = document.querySelector('.back-to-top');
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTopButton.classList.remove('invisible');
        backToTopButton.classList.add('visible');
        backToTopButton.style.display = 'block';
    } else {
        backToTopButton.classList.remove('visible');
        backToTopButton.classList.add('invisible');
        setTimeout(() => {
            backToTopButton.style.display = 'none';
        }, 500);
    }
});

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Efeito de destaque nas seções ao passar o mouse
const sections = document.querySelectorAll('.section');
sections.forEach(section => {
    section.addEventListener('mouseenter', () => {
        section.style.transform = 'scale(1.02)';
        section.style.transition = 'transform 0.3s ease-in-out';
    });
    section.addEventListener('mouseleave', () => {
        section.style.transform = 'scale(1)';
    });
});

// Atualização do Relógio
function updateClock() {
    const now = new Date();
    const clock = document.getElementById('clock');
    clock.textContent = now.toLocaleTimeString();
}

setInterval(updateClock, 1000);
document.addEventListener('DOMContentLoaded', updateClock);

// Simulação de IA no Robô Interativo com Integração GPT-3/4
const robot = document.getElementById('robot');
const chatBox = document.getElementById('robot-chat');
const userInput = document.getElementById('user-input');
const robotMessage = document.getElementById('robot-message');
const sendButton = document.getElementById('send-button');

robot.addEventListener('click', () => {
    chatBox.classList.toggle('active');
});

sendButton.addEventListener('click', async () => {
    const userQuestion = userInput.value.toLowerCase();
    if (!userQuestion) return;

    robot.classList.add('smiling');

    try {
        const response = await fetch('https://api.openai.com/v1/engines/davinci-codex/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer YOUR_OPENAI_API_KEY`
            },
            body: JSON.stringify({
                prompt: userQuestion,
                max_tokens: 150
            })
        });
        const data = await response.json();
        robotMessage.textContent = data.choices[0].text.trim();
    } catch (error) {
        robotMessage.textContent = 'Desculpe, algo deu errado. Tente novamente mais tarde.';
    }

    userInput.value = '';
    robot.classList.remove('smiling');
});

// Envio de Formulário de Contato via AJAX
const contactForm = document.getElementById('contact-form');
const formStatus = document.getElementById('form-status');

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    try {
        const response = await fetch('https://formspree.io/f/mqazravp', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            formStatus.textContent = 'Obrigado pela sua mensagem!';
            formStatus.style.color = '#1dd1a1';
            contactForm.reset();
        } else {
            formStatus.textContent = 'Ops! Algo deu errado, tente novamente.';
            formStatus.style.color = '#e25555';
        }
    } catch (error) {
        formStatus.textContent = 'Erro ao enviar, tente novamente.';
        formStatus.style.color = '#e25555';
    }
});

// Envio de Feedback via AJAX
const feedbackForm = document.getElementById('feedback-form');
const feedbackStatus = document.getElementById('feedback-status');

feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(feedbackForm);
    try {
        const response = await fetch('https://formspree.io/f/mqazravp', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            feedbackStatus.textContent = 'Obrigado pelo seu feedback!';
            feedbackStatus.style.color = '#1dd1a1';
            feedbackForm.reset();
        } else {
            feedbackStatus.textContent = 'Ops! Algo deu errado, tente novamente.';
            feedbackStatus.style.color = '#e25555';
        }
    } catch (error) {
        feedbackStatus.textContent = 'Erro ao enviar, tente novamente.';
        feedbackStatus.style.color = '#e25555';
    }
});
