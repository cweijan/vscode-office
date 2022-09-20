import $path from 'path'
import fs from 'fs'

/**
 * 本地文件
 * 用于对本地文件进行各种基本的操作
 */
export default class LocalFile {
	path: string

	base_name: string
	dir: string
	stem: string
	ext: string

	stat: fs.Stats

	/**
	 * Ensure to get a LocalFile instance
	 * 确保得到一个 LocalFile 实例
	 */
	static from(v: LocalFile | string) {
		if (typeof (v) === 'string') {
			return new LocalFile(v)
		}
		else if (v instanceof LocalFile) {
			return v
		}
		else {
			throw new Error(`错误`)
		}
	}

	/**
	 * Join two paths and get a LocalFile.
	 */
	static join(dir: LocalFile | string, uri: string) {
		dir = LocalFile.from(dir)
		return dir.c(uri)
	}

	/**
	 * 参见: https://nodejs.org/api/path.html#pathformatpathobject
	 */
	static format(pP: $path.FormatInputPathObject) {
		const path = $path.format(pP)
		return new LocalFile(path)
	}

	constructor(path: string) {
		this.updatePath(path)
	}

	/**
	 * 转换为字符串。采用属性`path`的值。
	 */
	toString() {
		return this.path
	}

	/**
	 * 设置本实例所对应的文件，进而更新相关属性。
	 * 一般发生在重命名、移动的操作之后。
	 */
	updatePath(path: string) {
		path = $path.normalize(path)
		this.path = path

		// 参见 https://nodejs.org/api/path.html#pathparsepath
		const parsed = $path.parse(path)
		this.base_name = parsed.base
		this.dir = parsed.dir
		this.stem = parsed.name
		this.ext = parsed.ext.slice(1) // 不包含开头的'.'

		this.stat = null
	}

	/**
	 * Check if this file really exists
	 * "e" is short for "exists"
	 * @result boolean
	 */
	e() {
		fs.existsSync(this.path)
	}

	/**
	 * Check if this.path is an absolute path.
	 * @result boolean
	 */
	isAbs() {
		return $path.isAbsolute(this.path)
	}

	/**
	 * Get the relative path from from_file to this.path
	 */
	rel(from_file: LocalFile | string) {
		from_file = LocalFile.from(from_file)
		return $path.relative(from_file.path, this.path)
	}

	/**
	 * Get the parent directory of this
	 */
	p() {
		return new LocalFile(this.dir)
	}

	/**
	 * Get and update stats
	 */
	s(force = false) {
		if (!this.stat || force) {
			this.stat = fs.statSync(this.path)
		}
		return this.stat
	}

	/**
	 * Check if this is a directory
	 */
	isD() {
		return this.s().isDirectory()
	}

	/**
	 * Check if this is a file
	 */
	isF() {
		return this.s().isFile()
	}

	/**
	 * List child files
	 */
	l() {
		const child_base_names = fs.readdirSync(this.path)
		return child_base_names.map(
			(child_base_name) => this.c(child_base_name)
		)
	}

	/**
	 * Create a child LocalFile
	 */
	c(uri: string) {
		return new LocalFile($path.join(this.path, uri))
	}

	/**
	 * Create a sibling LocalFile
	 */
	sibling(uri: string) {
		return new LocalFile($path.join(this.dir, uri))
	}

	/**
	 * Read this (as a file) to get its content.
	 */
	r() {
		return fs.readFileSync(this.path)
	}

	/**
	 * Make the directory if needed
	 */
	m() {
		fs.mkdirSync(this.dir, { recursive: true })
	}

	/**
	 * Write `content` to this (as a file).
	 */
	w(content: string) {
		fs.writeFileSync(this.path, content)
	}

	/**
	 * Append `part_content` to this (as a file).
	 */
	 append(part_content: string) {
		fs.appendFileSync(this.path, part_content)
	}

	/**
	 * Delete this.
	 */
	del() {
		fs.rmSync(this.path, { recursive: true })
	}

	/**
	 * Delete this file as a directory.
	 */
	delDir() {
		fs.rmdirSync(this.path, { recursive: true })
	}


	/**
	 * Delete this file as a file.
	 */
	delFile() {
		fs.unlinkSync(this.path)
	}

	/**
	 * Iterate every file under this (as a directory).
	 */
	each(iterator: (file: LocalFile)=> void) {
		this.l().forEach(iterator)
	}

	/**
	 * Clear all files under this (as a directory).
	 */
	clear() {
		this.each((file) => {
			file.del()
		})
	}


	/**
	 * 移动本文件到新的位置（目的地）
	 */
	move(destination: LocalFile | string) {
		destination = LocalFile.from(destination)
		fs.renameSync(this.path, destination.path)
		this.updatePath(destination.path)
	}
	/**
	 * Rename this file to a new base name.
	 */
	rename(new_base_name: string) {
		const destination = this.sibling(new_base_name)
		this.move(destination)
	}
}


