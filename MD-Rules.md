# GitHub Markdown Math Rendering

Apply these rules to every `.md` file. GitHub's Markdown emphasis parser runs **before** the math renderer (KaTeX). Certain characters inside `$...$` and `$$...$$` blocks are silently consumed, breaking the math.

## 1. Never use bare `^*` — use `^{\ast}`

```
# BAD
$x^*$        $x^* - I$       $$x^* = f(x^*)$$

# GOOD
$x^{\ast}$   $x^{\ast} - I$  $$x^{\ast} = f(x^{\ast})$$
```

## 2. Never use `\Big\{` / `\Big\}` — use `\Big\lbrace` / `\Big\rbrace`

```
# BAD
$$\sup\!\Big\{ r : \dots \Big\}$$

# GOOD
$$\sup\!\Big\lbrace r : \dots \Big\rbrace$$
```

## 3. Don't wrap math in `*...*` italic — use `_..._`

```
# BAD
*Jacobian of $f : X \to X$*

# GOOD
_Jacobian of $f : X \to X$_
```

## 4. Never use `\operatorname` — use `\mathrm`

```
# BAD
$\operatorname{tr}(A)$

# GOOD
$\mathrm{tr}(A)$
```

## 5. Never use `\#` or `|…|` for cardinality — use `\lvert…\rvert`

```
# BAD
$$|\lambda_{\max}|$$

# GOOD
$$\lvert\lambda_{\max}\rvert$$
```

## 6. Never use `\;` — remove it or use `\,` / `\quad`

```
# BAD
$$A \;=\; B$$

# GOOD
$$A = B$$
```

## 7. `\{` / `\}` in inline math arguments

Prefer `\lbrace` / `\rbrace` inside subscripts and arguments.

## 8. Never put `=` on its own line inside `$$...$$`

Keep `=` on the same line as the next token.

## 9. Never use `\\` for a matrix / aligned row break — use `\cr`

```
# BAD
$$\begin{pmatrix}1\\0\end{pmatrix}$$

# GOOD
$$\begin{pmatrix}1\cr 0\end{pmatrix}$$
```

# Reading arXiv Paper Sources

## 1. Normalize the URL

Convert `https://www.arxiv.org/abs/2601.07372` to
`https://www.arxiv.org/src/2601.07372`.

## 2. Download the paper source

Fetch the source archive to
`~/.cache/real-carrier-mechanics/knowledge/{arxiv_id}.tar.gz`.
Do not download again unless a refresh is required.

## 3. Unpack the source

Extract into `~/.cache/real-carrier-mechanics/knowledge/{arxiv_id}/`.

## 4. Locate the entry point

Find the primary LaTeX entry point, commonly `main.tex`.

## 5. Read the paper

Read the entry point and every relevant included source file.

## 6. Report

Write the paper summary to `./knowledge/summary_{tag}.md`. Do not overwrite an
existing summary. Interpret the paper against the active RCM specifications,
derivations, audits, or evidence, and state how it supports, challenges, or
suggests tests for the program.

# Long-Running Computations

Before starting any code expected to run longer than one minute, implement a
meaningful progress display. It must report completed and total work, elapsed
time, and an estimated time remaining. Prefer progress by scientific work unit
(case, grid, carrier, sample batch, or epoch) rather than an indeterminate
spinner. Keep the progress display compatible with parallel workers and ensure
it does not change numerical ordering or results.
