[33mcommit 08661a2f4973525438407bcdaac35b05fb92b079[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmain[m[33m)[m
Author: Caio Correia <caiovaleriogoulartcorreia@gmail.com>
Date:   Thu May 15 11:00:06 2025 -0300

    Fix: Corrigir problemas com o formulário de reembolso
    
    - Normalizado o valor monetário antes de enviar para a API
    - Adicionado tratamento para converter vírgula para ponto decimal
    - Melhorado o controle de posição do cursor durante a digitação de valores
