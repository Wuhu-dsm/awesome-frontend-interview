import type React from "react"
import { useMemo, useRef, useState, useLayoutEffect, useEffect } from "react"
import './index.less'

interface CardData {
    id: number
    width: number
    height: number
    src: string
    title?: string
    author?: string
}

interface WaterFallIprops {
    rowGap: number
    columnGap: number
    columns: number
}

const WaterFall: React.FC<WaterFallIprops> = (props) => {
    // Mock卡片数据
    const mockCardData: CardData[] = [
        { id: 1, width: 300, height: 200, src: 'https://picsum.photos/300/200?random=1', title: '美丽的风景', author: '张三' },
        { id: 2, width: 250, height: 400, src: 'https://picsum.photos/250/400?random=2', title: '城市夜景摄影作品集锦', author: '李四' },
        { id: 3, width: 350, height: 250, src: 'https://picsum.photos/350/250?random=3', title: '自然之美', author: '王五' },
        { id: 4, width: 280, height: 320, src: 'https://picsum.photos/280/320?random=4', title: '人物肖像', author: '赵六' },
        { id: 5, width: 320, height: 280, src: 'https://picsum.photos/320/280?random=5', title: '街头艺术', author: '钱七' },
        { id: 6, width: 260, height: 380, src: 'https://picsum.photos/260/380?random=6', title: '动物世界纪录片精选场景截图合集', author: '孙八' },
        { id: 7, width: 340, height: 220, src: 'https://picsum.photos/340/220?random=7', title: '建筑设计', author: '周九' },
        { id: 8, width: 290, height: 350, src: 'https://picsum.photos/290/350?random=8', title: '美食摄影', author: '吴十' },
        { id: 9, width: 310, height: 270, src: 'https://picsum.photos/310/270?random=9', title: '旅行日记', author: '郑十一' },
        { id: 10, width: 270, height: 360, src: 'https://picsum.photos/270/360?random=10', title: '艺术创作背后的故事与灵感来源探索', author: '王十二' },
        { id: 11, width: 330, height: 240, src: 'https://picsum.photos/330/240?random=11', title: '科技前沿', author: '冯十三' },
        { id: 12, width: 300, height: 300, src: 'https://picsum.photos/300/300?random=12', title: '生活随拍', author: '陈十四' },
    ];

    const [cardData] = useState(mockCardData)
    const { rowGap, columnGap, columns } = props
    const wrapRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const [wrapWidth, setWrapWidth] = useState(0)
    const [cardPosition, setCardPosition] = useState<{ top: number; left: number }[]>([])
    const [containerHeight, setContainerHeight] = useState(0)

    useLayoutEffect(() => {
        if (wrapRef.current) {
            setWrapWidth(wrapRef.current.clientWidth)
        }
    }, [])

    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            setWrapWidth(entries[0].contentRect.width)
        })
        if (wrapRef.current) {
            observer.observe(wrapRef.current)
        }
        return () => observer.disconnect()
    }, [])

    const columnWidth = useMemo(() => {
        if (wrapWidth) {
            return (wrapWidth - (columns - 1) * columnGap) / columns
        }
        return 0
    }, [wrapWidth, columnGap, columns])

    // 测量并计算位置
    useLayoutEffect(() => {
        if (columnWidth <= 0) return

        const positions: { top: number; left: number }[] = []
        const columnHeights = new Array(columns).fill(0)

        cardData.forEach((_, index) => {
            const cardHeight = cardRefs.current[index]?.offsetHeight || 0

            let minIndex = 0
            for (let i = 0; i < columnHeights.length; i++) {
                if (columnHeights[i] < columnHeights[minIndex]) {
                    minIndex = i
                }
            }

            const top = columnHeights[minIndex] + (columnHeights[minIndex] > 0 ? rowGap : 0)
            const left = minIndex * columnWidth + minIndex * columnGap

            columnHeights[minIndex] = top + cardHeight
            positions.push({ top, left })
        })

        setCardPosition(positions)
        setContainerHeight(Math.max(...columnHeights))
    }, [columnWidth, cardData, columns, rowGap, columnGap])

    const isReady = cardPosition.length > 0

    return (
        <div className="water-fall-wrap" ref={wrapRef}>
            <div
                className="water-fall-list"
                style={{ height: containerHeight }}
            >
                {cardData.map((item, index) => {
                    const position = cardPosition[index]
                    const imgHeight = (item.height * columnWidth) / item.width

                    return (
                        <div
                            key={item.id}
                            ref={el => cardRefs.current[index] = el}
                            className="water-fall-item"
                            style={{
                                position: 'absolute',
                                top: isReady ? `${position?.top || 0}px` : 0,
                                left: isReady ? `${position?.left || 0}px` : `${(index % columns) * (columnWidth + columnGap)}px`,
                                width: `${columnWidth}px`,
                                visibility: isReady ? 'visible' : 'hidden',
                            }}
                        >
                            <img
                                src={item.src}
                                alt={`card-${item.id}`}
                                style={{
                                    width: '100%',
                                    height: `${imgHeight}px`,
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                }}
                            />
                            {(item.title || item.author) && (
                                <div className="water-fall-item-info">
                                    {item.title && <div className="water-fall-item-title">{item.title}</div>}
                                    {item.author && <div className="water-fall-item-author">{item.author}</div>}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default WaterFall