function safeCopyToClipboard(text, msg) {
  if (window.copyToClipboard) {
    window.copyToClipboard(text, msg);
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      if (window.showToast) window.showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
    }).catch(() => fallbackExecCopy(text, msg));
  } else {
    fallbackExecCopy(text, msg);
  }
}
function fallbackExecCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (window.showToast) window.showToast('✓ ' + (msg || 'Panoya kopyalandı!'));
  } catch(e) {
    if (window.showToast) window.showToast('Kopyalama başarısız');
  }
  document.body.removeChild(ta);
}

let currentCardTheme = 'dark';
        let currentStatsData = null;

        const LANG_COLORS = {
          JavaScript: '#f7df1e',
          TypeScript: '#3178c6',
          Python: '#3572a5',
          HTML: '#e34c26',
          CSS: '#563d7c',
          Rust: '#dea584',
          Go: '#00add8',
          'C++': '#f34b7d',
          C: '#555555',
          Java: '#b07219',
          PHP: '#4f5d95',
          Ruby: '#701516',
          Shell: '#89e051',
          Vue: '#41b883',
          Kotlin: '#a97bff',
          Swift: '#f05138'
        };

        // 1. Analizi Çalıştır
        async function runGithubAnalysis(customUser = null) {
          const user = (customUser || document.getElementById('input-github-user').value).trim().replace(/^@/, '');
          if (!user) return;

          showLoading(true);

          try {
            const res = await fetch(`/api/github/user?username=${encodeURIComponent(user)}`);
            const data = await res.json();

            if (!data.success) {
              throw new Error(data.error || 'Kullanıcı bulunamadı');
            }

            currentStatsData = data;
            renderUserDashboard(data);
            setCardTheme(currentCardTheme || 'dark');
          } catch(err) {
            showToast('Hata: ' + err.message);
          } finally {
            showLoading(false);
          }
        }

        function quickAnalyze(user) {
          document.getElementById('input-github-user').value = user;
          runGithubAnalysis(user);
        }

        function showLoading(show) {
          const spin = document.getElementById('loading-spinner');
          const area = document.getElementById('github-results-area');
          if (show) {
            spin.classList.remove('hidden');
            area.classList.add('opacity-40', 'pointer-events-none');
          } else {
            spin.classList.add('hidden');
            area.classList.remove('opacity-40', 'pointer-events-none');
          }
        }

        // 2. Paneli Ekrana Çiz
        function renderUserDashboard(data) {
          const u = data.user;
          document.getElementById('user-avatar').src = u.avatar_url;
          document.getElementById('user-name').innerText = u.name || u.login;
          document.getElementById('user-login-link').innerText = '@' + u.login;
          document.getElementById('user-login-link').href = u.html_url;
          document.getElementById('user-bio').innerText = u.bio || 'Henüz bir biyografi eklenmemiş.';

          // Kıdem Rozeti
          const years = new Date().getFullYear() - new Date(u.created_at).getFullYear();
          document.getElementById('badge-join-date').innerText = `${years > 0 ? years + ' yıldır üye' : 'Yeni üye'}`;
          
          let rank = 'Junior Explorer';
          if (u.public_repos > 50 || data.totalStars > 100) rank = 'Master Architect 🏆';
          else if (u.public_repos > 20 || data.totalStars > 20) rank = 'Senior Hacker ⚡';
          else if (years >= 2) rank = 'Active Developer 🚀';
          document.getElementById('badge-dev-rank').innerText = rank;

          // Meta Bilgileri
          document.getElementById('meta-company').innerText = u.company ? '🏢 ' + u.company : '';
          document.getElementById('meta-location').innerText = u.location ? '📍 ' + u.location : '';
          const blogEl = document.getElementById('meta-blog');
          if (u.blog) {
            blogEl.innerText = '🔗 ' + u.blog.replace(/^https?:\/\//, '');
            blogEl.href = u.blog.startsWith('http') ? u.blog : 'https://' + u.blog;
            blogEl.classList.remove('hidden');
          } else {
            blogEl.classList.add('hidden');
          }

          // Sayaçlar (Hata vermeyen güvenli atamalar)
          const elStars = document.getElementById('stat-stars');
          const elStarred = document.getElementById('stat-starred');
          const elRepos = document.getElementById('stat-repos');
          const elFollowers = document.getElementById('stat-followers');
          const elFollowing = document.getElementById('stat-following');

          if (elStars) elStars.innerText = '⭐ ' + (data.totalStarsEarned || data.totalStars || 0).toLocaleString('tr-TR');
          if (elStarred) elStarred.innerText = '🌟 ' + (data.starredCount || 0).toLocaleString('tr-TR');
          if (elRepos) elRepos.innerText = (u.public_repos || 0).toLocaleString('tr-TR');
          if (elFollowers) elFollowers.innerText = (u.followers !== undefined ? u.followers : 0).toLocaleString('tr-TR');
          if (elFollowing) elFollowing.innerText = (u.following !== undefined ? u.following : 0).toLocaleString('tr-TR');

          // Diller (Varsayılan olarak kendi repoları varsa onu, yoksa takip edilenleri aç)
          if (data.hasOwnedLanguages) {
            switchLangTab('owned');
          } else {
            switchLangTab('starred');
          }

          // Repolar (Hem Yıldızlanan hem de Kendi Repoları)
          renderTopRepos(data.topRepos);
          renderStarredRepos(data.starredRepos);

          const elCountStarred = document.getElementById('tab-count-starred');
          const elCountOwned = document.getElementById('tab-count-owned');
          if (elCountStarred) elCountStarred.innerText = (data.starredRepos || []).length;
          if (elCountOwned) elCountOwned.innerText = (data.topRepos || []).length;

          // Eğer kullanıcının kendi reposu yoksa doğrudan Yıldızlanan Repolar sekmesini aç
          if (!data.topRepos || data.topRepos.length === 0) {
            switchRepoTab('starred');
          } else {
            switchRepoTab('owned');
          }
        }

        function switchRepoTab(tab) {
          const btnStarred = document.getElementById('tab-btn-starred');
          const btnOwned = document.getElementById('tab-btn-owned');
          const gridStarred = document.getElementById('starred-repos-grid');
          const gridOwned = document.getElementById('owned-repos-grid');
          const hint = document.getElementById('repo-view-hint');

          if (tab === 'starred') {
            btnStarred.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-purple-600 text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer';
            btnOwned.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-mistral-ink font-boldbg-mistral-cream hover:bg-mistral-cream-deeper text-mistral-ink border border-mistral-beige-deep transition flex items-center gap-1.5 cursor-pointer';
            gridStarred.classList.remove('hidden');
            gridOwned.classList.add('hidden');
            if (hint) hint.innerText = 'Geliştiricinin yıldızladığı (starred) favori projeler';
          } else {
            btnOwned.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-purple-600 text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer';
            btnStarred.className = 'px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-mistral-ink font-boldbg-mistral-cream hover:bg-mistral-cream-deeper text-mistral-ink border border-mistral-beige-deep transition flex items-center gap-1.5 cursor-pointer';
            gridOwned.classList.remove('hidden');
            gridStarred.classList.add('hidden');
            if (hint) hint.innerText = 'Geliştiricinin bizzat sahip olduğu herkese açık repolar';
          }
        }

        function renderStarredRepos(starred) {
          const grid = document.getElementById('starred-repos-grid');
          if (!starred || starred.length === 0) {
            grid.innerHTML = '<span class="text-xs text-mistral-stone col-span-full py-6 text-center">Yıldızlanmış herhangi bir repo bulunamadı.</span>';
            return;
          }

          grid.innerHTML = starred.map(r => `
            <div class="repo-card p-4 rounded-2xl bg-white border border-mistral-hairline hover:border-purple-400 hover:shadow-md transition duration-200 flex flex-col justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  ${r.owner?.avatar_url ? `<img src="${r.owner.avatar_url}" class="w-4 h-4 rounded-full" alt="owner">` : ''}
                  <span class="text-[11px] font-mono text-mistral-stone truncate">${r.full_name || r.name}</span>
                </div>
                <a href="${r.html_url}" target="_blank" rel="noopener" class="font-bold text-sm text-purple-600 hover:underline truncate block">
                  ${r.name}
                </a>
                <p class="text-xs text-mistral-slate mt-1.5 line-clamp-2 leading-relaxed">
                  ${r.description || 'Açıklama bulunmuyor.'}
                </p>
              </div>

              <div class="pt-3 border-t border-mistral-hairline flex items-center justify-between mt-3 text-xs font-mono text-mistral-slate">
                <span class="flex items-center gap-1 text-mistral-slate">
                  <span class="w-2 h-2 rounded-full" style="background-color: ${LANG_COLORS[r.language] || '#a855f7'};"></span>
                  ${r.language || 'Düz Metin'}
                </span>
                <div class="flex items-center gap-3 font-semibold text-mistral-ink">
                  <span class="text-amber-500 font-bold">⭐ ${Number(r.stargazers_count || 0).toLocaleString('en-US')}</span>
                  <span>🍴 ${Number(r.forks_count || 0).toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>
          `).join('');
        }

        function switchLangTab(tab) {
          const btnStarred = document.getElementById('tab-lang-starred');
          const btnOwned = document.getElementById('tab-lang-owned');
          const desc = document.getElementById('lang-tab-desc');

          if (!currentStatsData) return;

          if (tab === 'starred') {
            if (btnStarred) btnStarred.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer';
            if (btnOwned) btnOwned.className = 'px-3.5 py-1.5 rounded-xl text-xs font-medium text-mistral-ink font-boldbg-mistral-cream hover:bg-mistral-cream-deeper text-mistral-ink border border-mistral-beige-deep transition flex items-center gap-1.5 cursor-pointer';
            if (desc) desc.innerText = 'Geliştiricinin GitHub üzerinde yıldızladığı (starred) açık kaynak projelerin teknoloji ve dil dağılımı:';
            renderLanguageBreakdown(currentStatsData.starredLanguages || {}, true);
          } else {
            if (btnOwned) btnOwned.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer';
            if (btnStarred) btnStarred.className = 'px-3.5 py-1.5 rounded-xl text-xs font-medium text-mistral-ink font-boldbg-mistral-cream hover:bg-mistral-cream-deeper text-mistral-ink border border-mistral-beige-deep transition flex items-center gap-1.5 cursor-pointer';
            if (desc) desc.innerText = 'Geliştiricinin bizzat kod yazdığı ve sahip olduğu herkese açık repolarındaki dil dağılımı:';
            renderLanguageBreakdown(currentStatsData.languages || {}, false);
          }
        }

        function renderLanguageBreakdown(langs, isStarred = false) {
          const bar = document.getElementById('lang-bar-container');
          const cards = document.getElementById('lang-cards-container');
          const topBadge = document.getElementById('top-lang-badge');

          if (!bar || !cards) return;

          const langKeys = Object.keys(langs || {});
          if (langKeys.length === 0) {
            bar.innerHTML = '<div class="w-full h-full bg-slate-100"></div>';
            cards.innerHTML = `<div class="col-span-full py-6 text-center text-xs text-mistral-stone">${isStarred ? 'Yıldızlanan projelerde dil verisi bulunamadı.' : 'Henüz bizzat oluşturulmuş herkese açık bir kod deposu bulunmuyor.'}</div>`;
            if (topBadge) topBadge.innerText = 'Veri Yok';
            return;
          }

          if (topBadge) topBadge.innerText = (isStarred ? 'İlgi Odağı: ' : 'Lider Dil: ') + langKeys[0];

          // İlerleme çubuğu
          bar.innerHTML = langKeys.map(lang => {
            const pct = langs[lang];
            const color = LANG_COLORS[lang] || '#a855f7';
            return `<div class="h-full lang-progress-bar" style="width: ${pct}%; background-color: ${color};" title="${lang}: %${pct}"></div>`;
          }).join('');

          // Kartlar
          cards.innerHTML = langKeys.slice(0, 10).map(lang => {
            const pct = langs[lang];
            const color = LANG_COLORS[lang] || '#a855f7';
            return `
              <div class="p-2.5 rounded-xl bg-white border border-mistral-hairline flex items-center justify-between">
                <div class="flex items-center gap-2 truncate">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${color};"></span>
                  <span class="font-bold text-xs text-mistral-ink truncate">${lang}</span>
                </div>
                <span class="text-xs font-mono font-bold text-mistral-slate ml-1">%${pct}</span>
              </div>
            `;
          }).join('');
        }

        function renderTopRepos(repos) {
          const grid = document.getElementById('owned-repos-grid');
          if (!grid) return;

          if (!repos || repos.length === 0) {
            grid.innerHTML = '<span class="text-xs text-mistral-stone col-span-full py-6 text-center">Henüz herkese açık bir repo oluşturulmamış.</span>';
            return;
          }

          grid.innerHTML = repos.slice(0, 6).map(r => `
            <div class="repo-card p-4 rounded-2xl bg-white border border-mistral-hairline transition flex flex-col justify-between">
              <div>
                <a href="${r.html_url}" target="_blank" rel="noopener" class="font-bold text-sm text-purple-400 hover:underline truncate block">
                  ${r.name}
                </a>
                <p class="text-xs text-mistral-slate mt-1.5 line-clamp-2 leading-relaxed">
                  ${r.description || 'Açıklama bulunmuyor.'}
                </p>
              </div>

              <div class="pt-3 border-t border-mistral-hairline flex items-center justify-between mt-3 text-xs font-mono text-mistral-slate">
                <span class="flex items-center gap-1 text-mistral-slate">
                  <span class="w-2 h-2 rounded-full" style="background-color: ${LANG_COLORS[r.language] || '#a855f7'};"></span>
                  ${r.language || 'Düz Metin'}
                </span>
                <div class="flex items-center gap-3">
                  <span>⭐ ${r.stargazers_count}</span>
                  <span>🍴 ${r.forks_count}</span>
                </div>
              </div>
            </div>
          `).join('');
        }

        // 3. Dinamik SVG Rozet Üretimi
        function setCardTheme(theme) {
          currentCardTheme = theme;
          ['dark', 'cyberpunk', 'emerald', 'slate'].forEach(t => {
            const btn = document.getElementById('ct-' + t);
            if (btn) {
              if (t === theme) {
                btn.className = 'px-3 py-1 rounded-lg font-bold bg-purple-600 text-white transition shadow';
              } else {
                btn.className = 'px-3 py-1 rounded-lg font-bold text-mistral-slate hover:text-white transition';
              }
            }
          });

          const user = (document.getElementById('input-github-user').value || 'melihkarasu').trim().replace(/^@/, '');
          generateSvgCardPreview(user, theme);
        }

        function generateSvgCardPreview(user, theme) {
          const baseUrl = window.location.origin;
          const cleanUser = encodeURIComponent(user);
          const cleanTheme = encodeURIComponent(theme);
          const cardUrl = `${baseUrl}/api/github/card?user=${cleanUser}&theme=${cleanTheme}`;
          const container = document.getElementById('svg-card-preview');

          // İlk açılışta ve her tema değişiminde tarayıcı önbellek takılmasını önlemek için canlı render
          container.innerHTML = `<img src="${cardUrl}&t=${Date.now()}" alt="GitHub Stats Card" class="shadow-2xl rounded-2xl max-w-full block" style="min-height: 190px;">`;

          const mdSnippet = `[![GitHub Stats](${cardUrl})](${baseUrl}/app/github-analitik)`;
          const htmlSnippet = `<a href="${baseUrl}/app/github-analitik" target="_blank"><img src="${cardUrl}" alt="GitHub Profil Analitiği" /></a>`;

          document.getElementById('snippet-md').value = mdSnippet;
          document.getElementById('snippet-html').value = htmlSnippet;
        }

        function copySnippet(type) {
          const el = (type === 'md') ? document.getElementById('snippet-md') : document.getElementById('snippet-html');
          if (!el) return;
          const msg = (type === 'md' ? 'Markdown' : 'HTML') + ' kodu panoya kopyalandı!';
          safeCopyToClipboard(el.value, msg);
        }

        function showToast(msg) {
          const toast = document.getElementById('github-toast');
          toast.innerText = msg;
          toast.classList.remove('hidden');
          setTimeout(() => toast.classList.add('hidden'), 3500);
        }

        document.addEventListener('DOMContentLoaded', () => {
          runGithubAnalysis('melihkarasu');
        });
